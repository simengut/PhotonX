
import React, { useState, useMemo, useEffect } from 'react';
import { RunSession, Athlete, DataPoint, AppSettings, TrainingSession, LeaderboardEntry } from '../types';
import { TestType, UNIT_LABELS } from '../constants';
import { geminiService } from '../services/geminiService';
import { leaderboardService } from '../services/leaderboard';
import { useAuth } from '../contexts/AuthContext';
import PostToLeaderboardModal from './PostToLeaderboardModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';
import { Bot, Sparkles, ArrowLeft, Clock, Ruler, Activity, Timer, Zap, Target, Footprints, GitCompare, Plus, Check, X, Trophy } from 'lucide-react';

interface AnalysisProps {
  session: RunSession | null;
  athlete: Athlete | null;
  settings: AppSettings;
  allSessions: TrainingSession[]; // Needed to find other runs
  onBack: () => void;
  onCompare: (runs: RunSession[]) => void;
}

// Helpers
const convertSpeed = (mps: number, unit: string) => {
    if (unit === 'kph') return mps * 3.6;
    if (unit === 'mph') return mps * 2.23694;
    return mps;
};

const convertDist = (meters: number, unit: string) => {
    if (unit === 'imperial') return meters * 1.09361; // yards
    return meters;
};

const formatDate = (iso: string, format: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    if (format === 'DD.MM.YYYY') return `${dd}.${mm}.${yyyy}`;
    if (format === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
    return `${mm}.${dd}.${yyyy}`;
};

// Helper: Linear Interpolation to find exact speed/time at a specific distance
const interpolateAtDistance = (data: DataPoint[], targetDist: number) => {
  // Find the first point that exceeds the target distance
  const index = data.findIndex(d => d.distance >= targetDist);
  
  if (index === -1) return null; // Distance not reached
  if (index === 0) return { t: data[0].timestamp, v: data[0].speed }; 

  const pAfter = data[index];
  const pBefore = data[index - 1];

  // Linear interpolation
  const fraction = (targetDist - pBefore.distance) / (pAfter.distance - pBefore.distance);
  const time = pBefore.timestamp + fraction * (pAfter.timestamp - pBefore.timestamp);
  const speed = pBefore.speed + fraction * (pAfter.speed - pBefore.speed);
  
  return { t: time, v: speed };
};

const Analysis: React.FC<AnalysisProps> = ({ session, athlete, settings, allSessions, onBack, onCompare }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(session?.aiFeedback || null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedCompareRuns, setSelectedCompareRuns] = useState<RunSession[]>([]);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardTime, setLeaderboardTime] = useState<number | null>(null);
  const [leaderboardType, setLeaderboardType] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAlreadyPosted, setIsAlreadyPosted] = useState(false);
  const { user } = useAuth();

  // Memoize expensive calculations
  const stats = useMemo(() => {
    if (!session) return null;

    const { data, config } = session;
    if (data.length === 0) return null;

    // 1. Basic Max/Totals
    let maxSpeed = 0;
    let maxSpeedTime = 0;
    let maxSpeedDist = 0;
    
    data.forEach(d => {
        if (d.speed > maxSpeed) {
            maxSpeed = d.speed;
            maxSpeedTime = d.timestamp;
            maxSpeedDist = d.distance;
        }
    });

    const totalDist = data[data.length - 1].distance;
    const totalTime = data[data.length - 1].timestamp;

    // 2. Splits (every 10m)
    const splits: { start: number, end: number, time: number, cumTime: number, velocity: number }[] = [];
    const splitInterval = 10; // meters
    let currentDist = 0;
    let lastTime = 0; // start at 0

    while (currentDist + splitInterval <= totalDist + 5) { // +5 buffer to catch end
        const nextDist = currentDist + splitInterval;
        
        if (nextDist > totalDist && nextDist - totalDist > 2) break; 

        const p = interpolateAtDistance(data, nextDist);
        
        if (p) {
            const tAtDist = p.t;
            const segmentTime = (tAtDist - lastTime) / 1000; // seconds
            const velocity = splitInterval / segmentTime; // m/s
            
            splits.push({
                start: currentDist,
                end: nextDist,
                time: segmentTime,
                cumTime: tAtDist / 1000,
                velocity: velocity
            });
            
            lastTime = tAtDist;
            currentDist = nextDist;
        } else {
            break;
        }
    }

    // 3. Fly Test Specifics
    let flyResult = null;
    if (config.type === TestType.FLY && config.runUpDistance && config.flyDistance) {
        const startZone = config.runUpDistance;
        const endZone = config.runUpDistance + config.flyDistance;
        
        const pStart = interpolateAtDistance(data, startZone);
        const pEnd = interpolateAtDistance(data, endZone);
        
        if (pStart && pEnd) {
            const duration = (pEnd.t - pStart.t) / 1000;
            const avgSpeed = config.flyDistance / duration;
            flyResult = {
                duration,
                avgSpeed,
                startZone,
                endZone
            };
        }
    }

    // 4. Acceleration Test Specifics
    let accelResult = null;
    if (config.type === TestType.ACCELERATION && config.targetDistance) {
         const pEnd = interpolateAtDistance(data, config.targetDistance);
         if (pEnd) {
             accelResult = {
                 duration: pEnd.t / 1000,
                 dist: config.targetDistance
             };
         }
    }

    // 5. Approach Analysis (Relative Velocities for PV/LJ)
    let approachMetrics = null;
    if ((config.type === TestType.POLE_VAULT || config.type === TestType.LONG_JUMP) && config.boardLocation) {
         const board = config.boardLocation;
         
         // We want velocity at 10m out (Board - 10) and 5m out (Board - 5)
         // Note: Laser distance is raw. 10m OUT means laser distance = Board - 10.
         const tenOut = interpolateAtDistance(data, board - 10);
         const fiveOut = interpolateAtDistance(data, board - 5);
         const takeoff = interpolateAtDistance(data, board); // Should be ~0 if perfectly hit, or max velocity near end

         approachMetrics = {
             v10m: tenOut ? tenOut.v : null,
             v5m: fiveOut ? fiveOut.v : null,
             vTakeoff: takeoff ? takeoff.v : null
         };
    }

    return {
        maxSpeed,
        maxSpeedTime,
        maxSpeedDist,
        totalDist,
        totalTime,
        splits,
        flyResult,
        accelResult,
        approachMetrics
    };
  }, [session]);

  // Prepare Data for Chart (Relative if Board exists)
  const chartData = useMemo(() => {
      if (!session) return [];
      if (session.config.boardLocation) {
          const board = session.config.boardLocation;
          return session.data.map(d => ({
              ...d,
              relativeDist: -(board - d.distance) // -10 means 10m out
          }));
      }
      return session.data;
  }, [session]);

  // Comparison Logic
  const compatibleRuns = useMemo(() => {
      if (!session) return [];
      const list: {run: RunSession, sessionName: string}[] = [];
      allSessions.forEach(s => {
          s.runs.forEach(r => {
              if (r.id !== session.id && r.config.type === session.config.type) {
                  list.push({ run: r, sessionName: s.name });
              }
          });
      });
      return list;
  }, [session, allSessions]);

  const toggleCompareRun = (run: RunSession) => {
      if (selectedCompareRuns.find(r => r.id === run.id)) {
          setSelectedCompareRuns(selectedCompareRuns.filter(r => r.id !== run.id));
      } else {
          if (selectedCompareRuns.length >= 3) return; // Max 3 + current
          setSelectedCompareRuns([...selectedCompareRuns, run]);
      }
  };

  const startComparison = () => {
      if (selectedCompareRuns.length > 0) {
          onCompare([session!, ...selectedCompareRuns]);
      }
  };

  // Check if current run is eligible for leaderboard
  const getLeaderboardEligibility = (): { eligible: boolean; type: string | null; time: number | null } => {
      if (!session) return { eligible: false, type: null, time: null };

      const { config, data } = session;

      // 40 Yard Dash
      if (config.type === TestType.FORTY_YARD_DASH) {
          const result = interpolateAtDistance(data, 36.576); // 40 yards in meters
          if (result) {
              return { eligible: true, type: 'FORTY_YARD_DASH', time: result.t / 1000 }; // Convert ms to seconds
          }
      }

      // 60m Run
      if (config.type === TestType.SIXTY_METER_RUN) {
          const result = interpolateAtDistance(data, 60);
          if (result) {
              return { eligible: true, type: 'SIXTY_METER_RUN', time: result.t / 1000 };
          }
      }

      // 30m Acceleration (exactly 30m)
      if (config.type === TestType.ACCELERATION && config.targetDistance === 30) {
          const result = interpolateAtDistance(data, 30);
          if (result) {
              return { eligible: true, type: 'ACCELERATION_30M', time: result.t / 1000 };
          }
      }

      // 30m Flying (exactly 30m fly zone)
      if (config.type === TestType.FLY && config.flyDistance === 30 && config.runUpDistance) {
          const startPoint = interpolateAtDistance(data, config.runUpDistance);
          const endPoint = interpolateAtDistance(data, config.runUpDistance + 30);
          if (startPoint && endPoint) {
              const flyTime = (endPoint.t - startPoint.t) / 1000; // Convert ms to seconds
              return { eligible: true, type: 'FLY_30M', time: flyTime };
          }
      }

      return { eligible: false, type: null, time: null };
  };

  const handlePostToLeaderboard = () => {
      const eligibility = getLeaderboardEligibility();
      if (eligibility.eligible && eligibility.type && eligibility.time !== null) {
          setLeaderboardType(eligibility.type);
          setLeaderboardTime(eligibility.time);
          setShowLeaderboardModal(true);
      }
  };

  const confirmPostToLeaderboard = async () => {
      if (!session || !athlete || !user || !leaderboardType || leaderboardTime === null) {
          console.error('Missing required data for leaderboard post:', {
              session: !!session,
              athlete: !!athlete,
              user: !!user,
              leaderboardType,
              leaderboardTime
          });
          return;
      }

      try {
          const entry: LeaderboardEntry = {
              id: `${session.id}_${leaderboardType}`,
              testType: leaderboardType as any,
              athleteId: athlete.id,
              athleteName: athlete.name,
              athleteGender: athlete.gender,
              userId: user.uid,
              postedBy: 'coach', // For now, everyone posts as coach
              time: leaderboardTime,
              date: session.date,
              sessionId: session.id,
              runId: session.id,
              createdAt: new Date().toISOString()
          };

          console.log('Posting to leaderboard:', entry);
          await leaderboardService.postToLeaderboard(entry);
          console.log('Successfully posted to leaderboard!');

          // Mark as posted
          setIsAlreadyPosted(true);

          // Show success notification
          setNotification({ message: 'Successfully posted to leaderboard!', type: 'success' });
          setTimeout(() => setNotification(null), 4000);
      } catch (error: any) {
          console.error('Error posting to leaderboard:', error);
          setNotification({
              message: 'Failed to post: ' + (error.message || 'Unknown error'),
              type: 'error'
          });
          setTimeout(() => setNotification(null), 5000);
          throw error; // Re-throw so modal knows it failed
      }
  };

  // Check if this run has already been posted to leaderboard
  useEffect(() => {
      const checkIfPosted = async () => {
          if (!session || !user) return;

          const eligibility = getLeaderboardEligibility();
          if (!eligibility.eligible || !eligibility.type) return;

          try {
              const entryId = `${session.id}_${eligibility.type}`;
              const userEntries = await leaderboardService.getUserEntries(user.uid);
              const alreadyExists = userEntries.some(entry => entry.id === entryId);
              setIsAlreadyPosted(alreadyExists);
          } catch (error) {
              console.error('Error checking leaderboard status:', error);
          }
      };

      checkIfPosted();
  }, [session, user]);

  const eligibility = useMemo(() => getLeaderboardEligibility(), [session]);

  if (!session || !athlete || !stats) return null;
  
  const handleAiAnalyze = async () => {
    setIsLoadingAi(true);
    const result = await geminiService.analyzeRun(athlete, session.data);
    setAiAnalysis(result);
    setIsLoadingAi(false);
  };

  const dispMaxSpeed = convertSpeed(stats.maxSpeed, settings.speedUnit);
  const speedLabel = UNIT_LABELS.speed[settings.speedUnit];
  const distLabel = UNIT_LABELS.distance[settings.distanceUnit];

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto pb-10 relative">

      {/* Success/Error Notification */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-top-2 fade-in flex items-center gap-2 ${
          notification.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-green-600 text-white'
        }`}>
          {notification.type === 'success' ? (
            <Trophy size={18} className="flex-shrink-0" />
          ) : (
            <X size={18} className="flex-shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-[#E9E9E7] flex justify-between items-center">
                      <h3 className="font-serif font-bold text-[#37352F]">Compare Runs</h3>
                      <button onClick={() => setShowCompareModal(false)}><X size={20}/></button>
                  </div>
                  <div className="p-4 bg-[#F7F7F5] border-b border-[#E9E9E7]">
                      <p className="text-xs text-[#787774]">Select up to 3 other runs to compare with.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {compatibleRuns.length === 0 && (
                          <p className="text-center text-sm text-gray-400 py-8">No other compatible runs found.</p>
                      )}
                      {compatibleRuns.map(({run, sessionName}) => {
                          const isSelected = !!selectedCompareRuns.find(r => r.id === run.id);
                          const maxSpd = Math.max(...run.data.map(d => d.speed));
                          
                          return (
                              <div 
                                key={run.id} 
                                onClick={() => toggleCompareRun(run)}
                                className={`p-3 rounded border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-[#E9E9E7] hover:border-[#37352F]'}`}
                              >
                                  <div className="flex justify-between items-center">
                                      <div>
                                          <div className="font-bold text-[#37352F] text-sm">{sessionName}</div>
                                          <div className="text-xs text-[#9B9A97]">{new Date(run.date).toLocaleDateString()} • {run.jumpResult ? `${run.jumpResult.resultMetric}m` : `${convertSpeed(maxSpd, settings.speedUnit).toFixed(1)} ${speedLabel}`}</div>
                                      </div>
                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={12} className="text-white"/>}
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
                  <div className="p-4 border-t border-[#E9E9E7] flex justify-end gap-3">
                      <button onClick={() => setShowCompareModal(false)} className="px-4 py-2 rounded text-[#787774] hover:bg-[#F7F7F5] text-sm">Cancel</button>
                      <button 
                        onClick={startComparison} 
                        disabled={selectedCompareRuns.length === 0}
                        className="px-6 py-2 bg-[#37352F] text-white rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                      >
                          <GitCompare size={14}/> Compare ({selectedCompareRuns.length})
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="text-[#787774] hover:text-[#37352F] flex items-center gap-2 text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to History
        </button>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
                <div className="flex items-baseline gap-3">
                    <h1 className="text-3xl font-serif font-bold text-[#37352F]">{athlete.name}</h1>
                    <span className="text-[#9B9A97] font-medium">{formatDate(session.date, settings.dateFormat)}</span>
                </div>
                <div className="flex gap-2 mt-2">
                    <span className="bg-[#F7F7F5] text-[#787774] text-xs px-2 py-1 rounded border border-[#E9E9E7]">
                        {session.config.type === TestType.FLY ? 'Fly Test' : session.config.type === TestType.POLE_VAULT ? 'Pole Vault' : session.config.type === TestType.LONG_JUMP ? 'Long Jump' : 'Run'}
                    </span>
                    {session.config.boardLocation && (
                        <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                            <Target size={10}/> Calibrated Run
                        </span>
                    )}
                </div>
            </div>
            <div className="flex gap-3">
                {eligibility.eligible && (
                    <button
                        onClick={isAlreadyPosted ? undefined : handlePostToLeaderboard}
                        disabled={isAlreadyPosted}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                            isAlreadyPosted
                                ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                                : 'bg-[#37352F] text-white hover:bg-[#2F2F2F]'
                        }`}
                    >
                        {isAlreadyPosted ? (
                            <>
                                <Check size={18} /> Posted to Leaderboard
                            </>
                        ) : (
                            <>
                                <Trophy size={18} /> Post to Leaderboard
                            </>
                        )}
                    </button>
                )}
                <button
                    onClick={() => setShowCompareModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E9E9E7] rounded-lg text-[#37352F] font-medium hover:bg-[#F7F7F5] transition-colors shadow-sm"
                >
                    <GitCompare size={18} /> Compare Run
                </button>
            </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      <PostToLeaderboardModal
        isOpen={showLeaderboardModal}
        testType={leaderboardType || ''}
        athleteName={athlete.name}
        athleteGender={athlete.gender}
        time={leaderboardTime || 0}
        onClose={() => setShowLeaderboardModal(false)}
        onConfirm={confirmPostToLeaderboard}
      />

      {/* HERO METRIC */}
      {session.config.type === TestType.FLY && stats.flyResult && (
          <div className="mb-8 p-6 bg-[#37352F] text-white rounded-lg shadow-md flex flex-col md:flex-row items-center justify-between">
             <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fly Zone Time</div>
                <div className="text-5xl font-bold font-mono tracking-tighter">{stats.flyResult.duration.toFixed(3)}<span className="text-2xl text-gray-400">s</span></div>
             </div>
             <div className="mt-4 md:mt-0 text-right">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Avg Fly Velo</div>
                <div className="text-3xl font-bold tracking-tight">{convertSpeed(stats.flyResult.avgSpeed, settings.speedUnit).toFixed(2)} <span className="text-base font-normal text-gray-400">{speedLabel}</span></div>
             </div>
          </div>
      )}

      {(session.config.type === TestType.POLE_VAULT || session.config.type === TestType.LONG_JUMP) && session.jumpResult && (
           <div className="mb-8 p-6 bg-[#37352F] text-white rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center">
             <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {session.config.type === TestType.POLE_VAULT ? 'Bar Height' : 'Distance Jumped'}
                </div>
                <div className="flex items-baseline gap-2">
                    <div className="text-5xl font-bold font-mono tracking-tighter">{session.jumpResult.resultMetric.toFixed(2)}<span className="text-2xl text-gray-400">m</span></div>
                    {session.jumpResult.successful === false && <span className="text-red-400 font-bold text-xl">(MISS)</span>}
                </div>
             </div>
             
             <div className="flex gap-8 mt-4 md:mt-0">
                {session.jumpResult.stepCount && (
                     <div className="text-right">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Steps</div>
                        <div className="text-3xl font-bold flex items-center gap-2 justify-end"><Footprints size={20} className="text-gray-400"/> {session.jumpResult.stepCount}</div>
                     </div>
                )}
                {stats.approachMetrics && stats.approachMetrics.v10m && (
                     <div className="text-right">
                         <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">V @ 10m Out</div>
                         <div className="text-3xl font-bold">{convertSpeed(stats.approachMetrics.v10m, settings.speedUnit).toFixed(1)} <span className="text-sm font-normal text-gray-400">{speedLabel}</span></div>
                     </div>
                )}
             </div>
          </div>
      )}


      {/* SECONDARY METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E9E9E7] border border-[#E9E9E7] rounded-lg overflow-hidden mb-8 shadow-sm">
        <div className="bg-white p-6">
          <div className="flex items-center gap-2 mb-1 text-[#9B9A97]">
             <Zap size={14} /> <span className="text-xs uppercase font-bold tracking-wider">Peak Velo</span>
          </div>
          <p className="text-2xl font-bold text-[#37352F]">{dispMaxSpeed.toFixed(2)} <span className="text-sm font-normal text-[#9B9A97]">{speedLabel}</span></p>
        </div>
        <div className="bg-white p-6">
           <div className="flex items-center gap-2 mb-1 text-[#9B9A97]">
             <Ruler size={14} /> <span className="text-xs uppercase font-bold tracking-wider">Dist to Peak</span>
          </div>
          <p className="text-2xl font-bold text-[#37352F]">
             {session.config.boardLocation ? 
                (convertDist(stats.maxSpeedDist - session.config.boardLocation, settings.distanceUnit)).toFixed(1) // Relative
                : convertDist(stats.maxSpeedDist, settings.distanceUnit).toFixed(1)
             } <span className="text-sm font-normal text-[#9B9A97]">{distLabel}</span>
          </p>
        </div>
         <div className="bg-white p-6">
           <div className="flex items-center gap-2 mb-1 text-[#9B9A97]">
             <Timer size={14} /> <span className="text-xs uppercase font-bold tracking-wider">Time to Peak</span>
          </div>
          <p className="text-2xl font-bold text-[#37352F]">{(stats.maxSpeedTime / 1000).toFixed(2)} <span className="text-sm font-normal text-[#9B9A97]">s</span></p>
        </div>
         <div className="bg-white p-6">
           <div className="flex items-center gap-2 mb-1 text-[#9B9A97]">
             <Activity size={14} /> <span className="text-xs uppercase font-bold tracking-wider">Total Dist</span>
          </div>
          <p className="text-2xl font-bold text-[#37352F]">{convertDist(stats.totalDist, settings.distanceUnit).toFixed(2)} <span className="text-sm font-normal text-[#9B9A97]">{distLabel}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* CHART */}
        <div className="lg:col-span-2 bg-white border border-[#E9E9E7] rounded-lg p-6 h-96 shadow-sm">
            <h3 className="text-sm font-bold text-[#37352F] font-serif mb-6">Velocity Profile</h3>
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
                <defs>
                    <linearGradient id="gradSpeed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#37352F" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#37352F" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F7F7F5" vertical={false} />
                <XAxis 
                    dataKey={session.config.boardLocation ? "relativeDist" : "distance"} 
                    type="number" 
                    unit="m" 
                    domain={['auto', 'auto']} 
                    tickFormatter={(val) => convertDist(val, settings.distanceUnit).toFixed(0)} 
                    stroke="#E9E9E7" 
                    tick={{fill: '#9B9A97', fontSize: 12}} 
                    label={session.config.boardLocation ? { value: 'Distance from Takeoff (m)', position: 'insideBottom', offset: -5, fontSize: 10 } : undefined}
                />
                <YAxis stroke="#E9E9E7" tick={{fill: '#9B9A97', fontSize: 12}} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#E9E9E7', color: '#37352F' }} 
                    labelFormatter={(val) => session.config.boardLocation ? `At ${Number(val).toFixed(2)}m from takeoff` : `Distance: ${Number(val).toFixed(2)}m`}
                    formatter={(val: number) => [convertSpeed(val, settings.speedUnit).toFixed(2) + ' ' + speedLabel, 'Speed']}
                />
                
                {session.config.boardLocation && (
                    <ReferenceLine x={0} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Board', fill: '#10B981', fontSize: 10, position: 'top' }} />
                )}
                <ReferenceLine y={stats.maxSpeed} stroke="#E16259" strokeDasharray="3 3" label={{ value: 'Peak', fill: '#E16259', fontSize: 10, position: 'right' }} />
                
                <Area type="monotone" dataKey="speed" stroke="#37352F" strokeWidth={2} fill="url(#gradSpeed)" isAnimationActive={false} />
            </AreaChart>
            </ResponsiveContainer>
        </div>

        {/* NOTES & SPLITS */}
        <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-[#E9E9E7] bg-[#F7F7F5]">
                 <h3 className="text-sm font-bold text-[#37352F] font-serif">Notes & Splits</h3>
            </div>
            
            {session.notes && (
                 <div className="p-4 border-b border-[#E9E9E7] bg-yellow-50/50 text-sm italic text-[#37352F]">
                    "{session.notes}"
                 </div>
            )}

            <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-[#9B9A97] text-xs border-b border-[#E9E9E7]">
                            <th className="px-4 py-2 text-left font-normal">Dist ({distLabel})</th>
                            <th className="px-4 py-2 text-right font-normal">V<sub>avg</sub></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9E9E7]">
                        {stats.splits.map((split, i) => (
                            <tr key={i} className="hover:bg-[#F7F7F5]">
                                <td className="px-4 py-2 font-medium text-[#37352F]">{split.start}-{split.end}</td>
                                <td className="px-4 py-2 text-right font-mono text-[#787774]">{convertSpeed(split.velocity, settings.speedUnit).toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-[#F7F7F5] border border-[#E9E9E7] rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 text-[#37352F]">
            <Bot size={20} />
            <h3 className="font-serif font-bold">AI Coach Analysis</h3>
          </div>
          {!aiAnalysis && (
             <button onClick={handleAiAnalyze} disabled={isLoadingAi} className="flex items-center gap-2 text-xs font-medium bg-white border border-[#E9E9E7] px-3 py-1.5 rounded hover:bg-[#EFEFED] transition-colors text-[#37352F]">
              {isLoadingAi ? <Sparkles className="animate-spin" size={14}/> : <Sparkles size={14}/>}
              {isLoadingAi ? 'Generating...' : 'Analyze with Gemini'}
            </button>
          )}
        </div>
        
        {aiAnalysis ? (
            <div className="prose prose-sm max-w-none text-[#37352F] leading-relaxed whitespace-pre-line font-sans">
                {aiAnalysis}
            </div>
        ) : (
            <p className="text-[#9B9A97] text-sm italic">Run analysis to get technical feedback on acceleration and speed maintenance.</p>
        )}
      </div>
    </div>
  );
};

export default Analysis;
