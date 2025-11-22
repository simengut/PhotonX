
import React, { useState } from 'react';
import { ViewState, RunSession, TrainingSession, TestType, Athlete, AppSettings } from '../types';
import { TestType as TestTypeEnum } from '../constants';
import Navigation from './Navigation';
import LiveRun from './LiveRun';
import Analysis from './Analysis';
import SessionSetup from './SessionSetup';
import MeasurementMenu from './MeasurementMenu';
import Settings from './Settings';
import AddAthleteModal from './AddAthleteModal';
import EditAthleteModal from './EditAthleteModal';
import AthleteDetail from './AthleteDetail';
import Leaderboard from './Leaderboard';
import History from './History';
import SessionDetail from './SessionDetail';
import SensorCheck from './SensorCheck';
import Comparison from './Comparison';
import Analytics from './Analytics';
import PersonalBestModal from './PersonalBestModal';
import Guide from './Guide';
import { Activity, Play, Calendar, Users, ChevronRight, Plus, ArrowRight, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import { dbService } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const MainRouter: React.FC = () => {
  const { user, logout } = useAuth();
  const { athletes, sessions, settings, refreshSettings } = useData();
  const [logoError, setLogoError] = useState(false);
  
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // UI State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunSession | null>(null);
  const [comparisonRuns, setComparisonRuns] = useState<RunSession[]>([]); // State for comparison
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const [isSessionSetupOpen, setIsSessionSetupOpen] = useState(false);
  const [isAddAthleteModalOpen, setIsAddAthleteModalOpen] = useState(false);
  const [isEditAthleteModalOpen, setIsEditAthleteModalOpen] = useState(false);
  const [athleteToEdit, setAthleteToEdit] = useState<Athlete | null>(null);
  const [intendedTestType, setIntendedTestType] = useState<TestType>(TestTypeEnum.FREE_RUN);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female' | 'Other'>('all');

  // Notification State
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Personal Best Detection State
  interface PersonalBest {
    athleteId: string;
    athleteName: string;
    athleteGender?: 'Male' | 'Female' | 'Other';
    testType: 'FORTY_YARD_DASH' | 'ACCELERATION_30M' | 'FLY_30M' | 'SIXTY_METER_RUN';
    testLabel: string;
    newTime: number;
    oldTime: number | null;
    improvement: number;
    sessionId: string;
    runId: string;
    run: RunSession;
  }
  const [detectedPBs, setDetectedPBs] = useState<PersonalBest[]>([]);
  const [showPBModal, setShowPBModal] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  // --- Handlers ---

  // Helper to extract time from run data
  const getRunTime = (run: RunSession): number | null => {
    if (!run.data || run.data.length === 0) return null;
    const lastPoint = run.data[run.data.length - 1];
    return lastPoint.timestamp / 1000; // Convert ms to seconds
  };

  // Map TestType to Leaderboard test type
  const mapToLeaderboardType = (testType: TestType): 'FORTY_YARD_DASH' | 'ACCELERATION_30M' | 'FLY_30M' | 'SIXTY_METER_RUN' | null => {
    switch (testType) {
      case TestTypeEnum.FORTY_YARD_DASH:
        return 'FORTY_YARD_DASH';
      case TestTypeEnum.ACCELERATION:
        return 'ACCELERATION_30M';
      case TestTypeEnum.FLY:
        return 'FLY_30M';
      case TestTypeEnum.SIXTY_METER_RUN:
        return 'SIXTY_METER_RUN';
      default:
        return null; // Not eligible for leaderboard
    }
  };

  const getTestLabel = (testType: 'FORTY_YARD_DASH' | 'ACCELERATION_30M' | 'FLY_30M' | 'SIXTY_METER_RUN'): string => {
    switch (testType) {
      case 'FORTY_YARD_DASH':
        return '40 Yard Dash';
      case 'ACCELERATION_30M':
        return '30m Acceleration';
      case 'FLY_30M':
        return '30m Fly';
      case 'SIXTY_METER_RUN':
        return '60m Run';
    }
  };

  // Detect personal bests in a session
  const detectPersonalBests = (session: TrainingSession): PersonalBest[] => {
    const pbs: PersonalBest[] = [];

    // Get all historical runs (excluding current session)
    const historicalRuns = sessions
      .filter(s => s.id !== session.id)
      .flatMap(s => s.runs);

    // Check each run in the completed session
    for (const run of session.runs) {
      const leaderboardType = mapToLeaderboardType(run.config.type);
      if (!leaderboardType) continue; // Skip non-leaderboard tests

      const newTime = getRunTime(run);
      if (!newTime) continue; // Skip if no valid time

      const athlete = athletes.find(a => a.id === run.athleteId);
      if (!athlete) continue;

      // Find previous best time for this athlete and test type
      const previousRuns = historicalRuns.filter(
        r => r.athleteId === run.athleteId && mapToLeaderboardType(r.config.type) === leaderboardType
      );

      const previousTimes = previousRuns
        .map(r => getRunTime(r))
        .filter((t): t is number => t !== null);

      const oldBestTime = previousTimes.length > 0 ? Math.min(...previousTimes) : null;

      // Check if this is a personal best
      if (oldBestTime === null || newTime < oldBestTime) {
        const improvement = oldBestTime ? ((oldBestTime - newTime) / oldBestTime) * 100 : 0;

        pbs.push({
          athleteId: run.athleteId,
          athleteName: athlete.name,
          athleteGender: athlete.gender,
          testType: leaderboardType,
          testLabel: getTestLabel(leaderboardType),
          newTime,
          oldTime: oldBestTime,
          improvement,
          sessionId: session.id,
          runId: run.id,
          run
        });
      }
    }

    return pbs;
  };

  const handleStartSessionFlow = (testType: TestType) => {
      setIntendedTestType(testType);
      setIsSessionSetupOpen(true);
  };

  const handleCreateSession = async (name: string, athleteIds: string[]) => {
    const newSession: TrainingSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      name,
      athleteIds,
      runs: [],
      status: 'ACTIVE'
    };
    await dbService.createSession(newSession);
    setActiveSessionId(newSession.id);
    setIsSessionSetupOpen(false);
    setView(ViewState.LIVE_RUN);
  };

  const handleResumeSession = (sessionId: string) => {
      setActiveSessionId(sessionId);
      setSelectedSessionId(null);
      setView(ViewState.LIVE_RUN);
  };

  const handleDeleteSession = async (sessionId: string) => {
      if (isDeleting) return;
      setIsDeleting(true);
      try {
          await dbService.deleteSession(sessionId);
          
          showNotification("Session deleted successfully", 'success');

          if (selectedSessionId === sessionId) {
              setSelectedSessionId(null);
              setView(ViewState.HISTORY);
          }
          if (activeSessionId === sessionId) {
              setActiveSessionId(null);
              setView(ViewState.DASHBOARD);
          }
      } catch (error: any) {
          console.error("Delete failed:", error);
          showNotification("Failed to delete session: " + error.message, 'error');
      } finally {
          setIsDeleting(false);
      }
  };

  const handleUpdateSessionName = async (sessionId: string, name: string) => {
      await dbService.updateSession(sessionId, { name });
      showNotification("Session renamed");
  };

  const handleUpdateSessionAthletes = async (athleteIds: string[]) => {
      if (activeSessionId) {
          await dbService.updateSessionAthletes(activeSessionId, athleteIds);
          showNotification("Athletes updated");
      }
  };

  const handleSaveRun = async (run: RunSession) => {
    if (activeSessionId) await dbService.addRunToSession(activeSessionId, run);
  };

  const handleUpdateRun = async (updatedRun: RunSession) => {
      if (activeSessionId) {
          const session = sessions.find(s => s.id === activeSessionId);
          if (session) {
              const updatedRuns = session.runs.map(r => r.id === updatedRun.id ? updatedRun : r);
              await dbService.updateRunInSession(activeSessionId, updatedRuns);
              showNotification("Run updated");
          }
      }
  };

  const handleEndSession = async () => {
    if (activeSessionId) {
      const sessionId = activeSessionId;
      const session = sessions.find(s => s.id === sessionId);

      await dbService.finishSession(sessionId);
      setActiveSessionId(null);

      // Detect personal bests
      if (session) {
        const pbs = detectPersonalBests(session);
        if (pbs.length > 0) {
          setDetectedPBs(pbs);
          setShowPBModal(true);
        }
      }

      // Navigate to Session Detail view
      setSelectedSessionId(sessionId);
      setView(ViewState.SESSION_DETAIL);
    }
  };

  const handleAddAthlete = async (athlete: Athlete) => {
    await dbService.addAthlete(athlete);
    setIsAddAthleteModalOpen(false);
    showNotification("Athlete added");
  };

  const handleUpdateAthlete = async (athlete: Athlete) => {
    await dbService.updateAthlete(athlete);
    setIsEditAthleteModalOpen(false);
    setAthleteToEdit(null);
    showNotification("Athlete updated");
  };

  const handleDeleteAthlete = async (athleteId: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await dbService.deleteAthlete(athleteId);
      showNotification("Athlete deleted successfully", 'success');
      setSelectedAthleteId(null);
      setView(ViewState.ATHLETES);
    } catch (error: any) {
      console.error("Delete failed:", error);
      showNotification("Failed to delete athlete: " + error.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditAthlete = (athlete: Athlete) => {
    setAthleteToEdit(athlete);
    setIsEditAthleteModalOpen(true);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
      await dbService.saveSettings(newSettings);
      refreshSettings();
      showNotification("Settings saved");
  };

  const handleStartComparison = (runs: RunSession[]) => {
      setComparisonRuns(runs);
      setView(ViewState.COMPARISON);
  };

  // --- Render Helpers ---

  const activeSession = sessions.find(s => s.id === activeSessionId);
  
  const renderContent = () => {
    if (isSessionSetupOpen) {
        return (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-[#E9E9E7] p-8 max-h-[90vh] overflow-y-auto">
                    <SessionSetup
                        allAthletes={athletes}
                        onStartSession={handleCreateSession}
                        onAddAthlete={handleAddAthlete}
                        onCancel={() => setIsSessionSetupOpen(false)}
                        testType={intendedTestType}
                    />
                </div>
            </div>
        );
    }

    switch (view) {
      case ViewState.LIVE_RUN:
        if (activeSession) {
            return <LiveRun 
                      activeSession={activeSession} 
                      availableAthletes={athletes.filter(a => activeSession.athleteIds.includes(a.id))}
                      allAthletes={athletes}
                      settings={settings}
                      initialTestType={intendedTestType}
                      onSaveSession={handleSaveRun}
                      onUpdateRun={handleUpdateRun}
                      onEndSession={handleEndSession}
                      onViewRun={(run) => { setSelectedRun(run); setView(ViewState.ANALYSIS); }}
                      onUpdateSessionAthletes={handleUpdateSessionAthletes}
                      onCreateAthlete={handleAddAthlete}
                   />;
        } else {
            return <MeasurementMenu onSelectType={handleStartSessionFlow} />;
        }

      case ViewState.ANALYSIS:
        return <Analysis 
                  session={selectedRun} 
                  athlete={athletes.find(a => a.id === selectedRun?.athleteId) || null}
                  settings={settings}
                  allSessions={sessions}
                  onBack={() => {
                      setSelectedRun(null); 
                      if (selectedSessionId) setView(ViewState.SESSION_DETAIL);
                      else if (activeSessionId) setView(ViewState.LIVE_RUN);
                      else setView(ViewState.HISTORY);
                  }}
                  onCompare={handleStartComparison}
               />;
      
      case ViewState.COMPARISON:
         return <Comparison 
                  runs={comparisonRuns}
                  athletes={athletes}
                  settings={settings}
                  onBack={() => setView(ViewState.ANALYSIS)}
                />;

      case ViewState.HISTORY:
        return <History 
                  sessions={sessions} 
                  athletes={athletes}
                  settings={settings}
                  onSelectSession={(s) => { setSelectedSessionId(s.id); setView(ViewState.SESSION_DETAIL); }}
                  onDeleteSession={handleDeleteSession}
               />;

      case ViewState.SESSION_DETAIL:
          const detailSession = sessions.find(s => s.id === selectedSessionId);
          if (!detailSession) return <div className="p-8">Session not found.</div>;
          return <SessionDetail 
                    session={detailSession}
                    athletes={athletes}
                    settings={settings}
                    onBack={() => { setSelectedSessionId(null); setView(ViewState.HISTORY); }}
                    onResume={handleResumeSession}
                    onDelete={handleDeleteSession}
                    onUpdateName={handleUpdateSessionName}
                    onSelectRun={(run) => { setSelectedRun(run); setView(ViewState.ANALYSIS); }}
                 />;

      case ViewState.ATHLETES:
        const filteredAthletes = athletes
          .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .filter(a => genderFilter === 'all' || a.gender === genderFilter);
        return (
          <div className="max-w-5xl mx-auto">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                 <div>
                    <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2">Athletes</h1>
                    <p className="text-[#787774]">Manage your roster.</p>
                 </div>
                 <button onClick={() => setIsAddAthleteModalOpen(true)} className="bg-[#37352F] text-white px-4 py-2 rounded font-medium hover:bg-[#2F2F2F] transition-colors flex items-center gap-2 shadow-sm">
                     <Plus size={18} /> Add Athlete
                 </button>
             </div>

             <div className="mb-6 flex flex-col md:flex-row gap-4">
                 <input
                    type="text"
                    placeholder="Search athletes..."
                    className="flex-1 md:max-w-xs px-4 py-2 border border-[#E9E9E7] rounded bg-white text-sm focus:outline-none focus:border-[#37352F]"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
                 <div className="flex gap-2">
                    <button
                      onClick={() => setGenderFilter('all')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        genderFilter === 'all'
                          ? 'bg-[#37352F] text-white'
                          : 'border border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setGenderFilter('Male')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        genderFilter === 'Male'
                          ? 'bg-[#37352F] text-white'
                          : 'border border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5]'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      onClick={() => setGenderFilter('Female')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        genderFilter === 'Female'
                          ? 'bg-[#37352F] text-white'
                          : 'border border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5]'
                      }`}
                    >
                      Female
                    </button>
                 </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAthletes.map(athlete => (
                    <div key={athlete.id} className="bg-white border border-[#E9E9E7] rounded-xl p-6 hover:shadow-md transition-all group cursor-pointer" onClick={() => { setSelectedAthleteId(athlete.id); setView(ViewState.ATHLETE_DETAIL); }}>
                        <div className="flex items-start justify-between mb-4">
                             <div className="w-12 h-12 rounded-full bg-[#F7F7F5] text-[#37352F] font-serif font-bold text-xl flex items-center justify-center border border-[#E9E9E7]">
                                 {athlete.name.charAt(0)}
                             </div>
                             <div className="flex gap-2">
                                 <button
                                     onClick={(e) => { e.stopPropagation(); handleEditAthlete(athlete); }}
                                     className="text-[#9B9A97] hover:text-[#37352F] opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#F7F7F5] rounded"
                                 >
                                     <Edit2 size={16} />
                                 </button>
                                 <button
                                     onClick={(e) => { e.stopPropagation(); setSelectedAthleteId(athlete.id); setView(ViewState.ATHLETE_DETAIL); }}
                                     className="text-[#9B9A97] hover:text-[#37352F] opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                     <ArrowRight size={20} />
                                 </button>
                             </div>
                        </div>
                        <h3 className="font-bold text-lg text-[#37352F] mb-1">{athlete.name}</h3>
                        <div className="space-y-1">
                             <p className="text-xs text-[#9B9A97] uppercase tracking-wider font-bold">{athlete.primaryEvent || 'Athlete'}</p>
                             {athlete.email && <p className="text-sm text-[#787774]">{athlete.email}</p>}
                             {athlete.gender && <p className="text-sm text-[#787774]">{athlete.gender}, {athlete.dob ? new Date().getFullYear() - new Date(athlete.dob).getFullYear() : ''} yrs</p>}
                        </div>
                    </div>
                ))}
             </div>

             {filteredAthletes.length === 0 && (
                 <div className="text-center py-12 bg-[#F7F7F5] rounded-lg border border-dashed border-[#E9E9E7]">
                     <p className="text-[#9B9A97]">No athletes found.</p>
                 </div>
             )}
          </div>
        );

      case ViewState.ATHLETE_DETAIL:
        const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
        if (!selectedAthlete) return <div className="p-8">Athlete not found.</div>;
        return <AthleteDetail
                  athlete={selectedAthlete}
                  allSessions={sessions}
                  settings={settings}
                  onBack={() => { setSelectedAthleteId(null); setView(ViewState.ATHLETES); }}
                  onEdit={handleEditAthlete}
                  onDelete={handleDeleteAthlete}
                  onSelectRun={(run) => { setSelectedRun(run); setView(ViewState.ANALYSIS); }}
               />;

      case ViewState.LEADERBOARD:
        return <Leaderboard onStartTest={handleStartSessionFlow} />;

      case ViewState.ANALYTICS:
        return <Analytics athletes={athletes} sessions={sessions} settings={settings} />;

      case ViewState.SETTINGS:
        return <Settings settings={settings} onUpdateSettings={handleUpdateSettings} onLogout={logout} userEmail={user.email}/>;

      case ViewState.SENSOR_CHECK:
        return <SensorCheck />;

      case ViewState.GUIDE:
        return <Guide />;

      default: // Dashboard
        return (
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2">Welcome back, Coach</h1>
                    <p className="text-[#787774]">Here is your training overview.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-[#37352F] text-white rounded-xl p-6 shadow-lg flex flex-col justify-between min-h-[160px] relative overflow-hidden group cursor-pointer" onClick={() => setView(ViewState.LIVE_RUN)}>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2"><Play size={16} fill="currentColor"/> Quick Start</div>
                            <h3 className="text-2xl font-bold mb-1">New Session</h3>
                            <p className="text-gray-400 text-sm">Start a measurement.</p>
                        </div>
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform">
                             <Activity size={120} />
                        </div>
                    </div>
                     
                    <div className="bg-white border border-[#E9E9E7] rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[160px] hover:border-[#37352F] transition-colors cursor-pointer" onClick={() => setView(ViewState.HISTORY)}>
                        <div>
                            <div className="flex items-center gap-2 text-[#9B9A97] text-sm font-medium mb-2"><Calendar size={16}/> Recent</div>
                            <h3 className="text-2xl font-bold text-[#37352F] mb-1">{sessions.length} Sessions</h3>
                            <p className="text-[#787774] text-sm">View training logs.</p>
                        </div>
                    </div>

                    <div className="bg-white border border-[#E9E9E7] rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[160px] hover:border-[#37352F] transition-colors cursor-pointer" onClick={() => setView(ViewState.ATHLETES)}>
                        <div>
                            <div className="flex items-center gap-2 text-[#9B9A97] text-sm font-medium mb-2"><Users size={16}/> Roster</div>
                            <h3 className="text-2xl font-bold text-[#37352F] mb-1">{athletes.length} Athletes</h3>
                            <p className="text-[#787774] text-sm">Manage profiles.</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif font-bold text-xl text-[#37352F]">Quick Actions</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button onClick={() => setView(ViewState.LEADERBOARD)} className="w-full bg-white border border-[#E9E9E7] rounded-xl p-4 hover:border-[#37352F] transition-colors text-left flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] flex items-center justify-center group-hover:bg-[#37352F] transition-colors">
                                        <Activity size={20} className="text-[#9B9A97] group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-[#37352F]">View Leaderboard</div>
                                        <div className="text-xs text-[#787774]">Compare with global athletes</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-[#E9E9E7] group-hover:text-[#37352F] transition-colors" />
                            </button>

                            <button onClick={() => setView(ViewState.HISTORY)} className="w-full bg-white border border-[#E9E9E7] rounded-xl p-4 hover:border-[#37352F] transition-colors text-left flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] flex items-center justify-center group-hover:bg-[#37352F] transition-colors">
                                        <Calendar size={20} className="text-[#9B9A97] group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-[#37352F]">Training History</div>
                                        <div className="text-xs text-[#787774]">View all {sessions.length} sessions</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-[#E9E9E7] group-hover:text-[#37352F] transition-colors" />
                            </button>

                            <button onClick={() => setIsAddAthleteModalOpen(true)} className="w-full bg-white border border-[#E9E9E7] rounded-xl p-4 hover:border-[#37352F] transition-colors text-left flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] flex items-center justify-center group-hover:bg-[#37352F] transition-colors">
                                        <Plus size={20} className="text-[#9B9A97] group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-[#37352F]">Add New Athlete</div>
                                        <div className="text-xs text-[#787774]">Create a new profile</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-[#E9E9E7] group-hover:text-[#37352F] transition-colors" />
                            </button>
                    </div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
       {/* Global Notification Toast */}
       {notification && (
           <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-in slide-in-from-top-2 fade-in flex items-center gap-2 ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#37352F] text-white'}`}>
               {notification.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} className="text-green-400"/>}
               {notification.message}
           </div>
       )}

       {isDeleting && (
           <div className="fixed inset-0 z-[100] bg-white/50 backdrop-blur-[1px] cursor-wait flex items-center justify-center">
               <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3 border border-[#E9E9E7]">
                   <div className="w-4 h-4 border-2 border-[#37352F] border-t-transparent rounded-full animate-spin"></div>
                   <span className="text-sm font-medium text-[#37352F]">Processing...</span>
               </div>
           </div>
       )}

       <AddAthleteModal
          isOpen={isAddAthleteModalOpen}
          onClose={() => setIsAddAthleteModalOpen(false)}
          onSave={handleAddAthlete}
        />
       <EditAthleteModal
          isOpen={isEditAthleteModalOpen}
          athlete={athleteToEdit}
          onClose={() => { setIsEditAthleteModalOpen(false); setAthleteToEdit(null); }}
          onSave={handleUpdateAthlete}
        />
       <PersonalBestModal
          isOpen={showPBModal}
          personalBests={detectedPBs}
          onClose={() => {
            setShowPBModal(false);
            setDetectedPBs([]);
          }}
        />
      <Navigation currentView={view} onChangeView={setView} onLogout={logout} />
      <main className="flex-1 overflow-y-auto md:pl-60 h-full w-full">
        <div className="md:hidden h-14 border-b border-[#E9E9E7] flex items-center justify-center bg-white sticky top-0 z-20">
             {!logoError ? (
                  <img
                    src="favicon.png?v=8"
                    className="h-8 w-auto object-contain"
                    alt="Logo"
                    onError={() => setLogoError(true)}
                  />
             ) : (
                  <Activity size={20} className="text-[#37352F]" />
             )}
        </div>
        <div className="p-4 pb-20 md:p-8 max-w-7xl mx-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default MainRouter;
