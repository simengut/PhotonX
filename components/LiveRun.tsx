
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Athlete, DataPoint, RunSession, TestConfig, TrainingSession, AppSettings, JumpResult } from '../types';
import { TestType, TEST_TYPES, UNIT_LABELS } from '../constants';
import { serialService } from '../services/serialService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Play, Square, Wifi, WifiOff, Save, Settings2, Info, Timer, LogOut, Edit2, Check, Plus, Search, X, List, Target, ClipboardPen, Ruler, Footprints, Trash2, Crosshair, ChevronDown } from 'lucide-react';

interface LiveRunProps {
  activeSession: TrainingSession;
  availableAthletes: Athlete[];
  allAthletes: Athlete[];
  settings: AppSettings;
  initialTestType?: TestType;
  onSaveSession: (session: RunSession) => void; 
  onUpdateRun: (run: RunSession) => void;
  onEndSession: () => void;
  onViewRun: (run: RunSession) => void;
  onUpdateSessionAthletes: (athleteIds: string[]) => void;
  onCreateAthlete: (athlete: Athlete) => void;
}

// Unit conversion helper
const convertSpeed = (mps: number, unit: string) => {
    if (unit === 'kph') return mps * 3.6;
    if (unit === 'mph') return mps * 2.23694;
    return mps;
};

const convertDist = (meters: number, unit: string) => {
    if (unit === 'imperial') return meters * 1.09361; // yards
    return meters;
};

// Helper for immediate result calculation
const calculateResult = (data: DataPoint[], testType: TestType, target: number, runUp: number, fly: number) => {
    if (data.length < 2) return null;

    const interpolateTime = (dist: number) => {
        const idx = data.findIndex(d => d.distance >= dist);
        if (idx === -1 || idx === 0) return null;
        const p1 = data[idx-1];
        const p2 = data[idx];
        const frac = (dist - p1.distance) / (p2.distance - p1.distance);
        return p1.timestamp + frac * (p2.timestamp - p1.timestamp);
    };

    if (testType === TestType.ACCELERATION) {
        const t = interpolateTime(target);
        return t ? (t / 1000).toFixed(3) + 's' : null;
    }

    if (testType === TestType.FLY) {
        const tStart = interpolateTime(runUp);
        const tEnd = interpolateTime(runUp + fly);
        if (tStart && tEnd) {
            return ((tEnd - tStart) / 1000).toFixed(3) + 's';
        }
    }

    if (testType === TestType.FORTY_YARD_DASH) {
        const t = interpolateTime(36.576); // 40 yards in meters
        return t ? (t / 1000).toFixed(3) + 's' : null;
    }

    if (testType === TestType.SIXTY_METER_RUN) {
        const t = interpolateTime(60);
        return t ? (t / 1000).toFixed(3) + 's' : null;
    }

    return null;
};

const LiveRun: React.FC<LiveRunProps> = ({ activeSession, availableAthletes, allAthletes, settings, initialTestType, onSaveSession, onUpdateRun, onEndSession, onViewRun, onUpdateSessionAthletes, onCreateAthlete }) => {
  // State
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(availableAthletes[0]?.id || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [data, setData] = useState<DataPoint[]>([]);
  const [status, setStatus] = useState('Ready');
  const [simInterval, setSimInterval] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [showSessionLog, setShowSessionLog] = useState(false);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  
  // Live Data State (for calibration and display)
  const [liveDistance, setLiveDistance] = useState<number>(0);

  // Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false); // New calibration modal
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Jump / Result Entry State (Inline)
  const [showResultEntry, setShowResultEntry] = useState(false);
  const [jumpMetric, setJumpMetric] = useState(''); // Height or Distance
  const [jumpSuccess, setJumpSuccess] = useState<boolean | null>(null); // For PV
  const [runNotes, setRunNotes] = useState('');
  const [stepCount, setStepCount] = useState('');
  const [detectedTakeoff, setDetectedTakeoff] = useState<number | null>(null);
  
  // Run Finished State for Non-Jump tests
  const [runFinished, setRunFinished] = useState(false);

  // Create Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGender, setNewGender] = useState<'Male' | 'Female'>('Male');
  const [newDob, setNewDob] = useState('');
  const [newEvent, setNewEvent] = useState('');

  // Refs
  const isRecordingRef = useRef(false);
  const handleDataRef = useRef<((dist: number) => void) | null>(null);
  
  // Test Config
  const [testType, setTestType] = useState<TestType>(initialTestType || TestType.FREE_RUN);
  const [targetDist, setTargetDist] = useState<number>(30);
  const [runUpDist, setRunUpDist] = useState<number>(20);
  const [flyDist, setFlyDist] = useState<number>(10);
  const [boardLocation, setBoardLocation] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const startTimeRef = useRef<number>(0);
  const lastDistanceRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dataBufferRef = useRef<DataPoint[]>([]);

  // Auto-select first athlete if current selection is invalid
  useEffect(() => {
     if (availableAthletes.length > 0 && !availableAthletes.find(a => a.id === selectedAthleteId)) {
         setSelectedAthleteId(availableAthletes[0].id);
     }
  }, [availableAthletes, selectedAthleteId]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Initialize Modal State
  useEffect(() => {
      if (isManageModalOpen) {
          setTempSelectedIds(activeSession.athleteIds);
          setSearchTerm('');
          setShowCreateForm(false);
      }
  }, [isManageModalOpen, activeSession.athleteIds]);

  const handleSerialData = useCallback((distanceCm: number) => {
    const distanceM = distanceCm / 100; 
    
    // Always update live view
    setLiveDistance(distanceM);

    if (!isRecordingRef.current) {
        return;
    }
    
    const now = performance.now();
    const timeElapsed = now - startTimeRef.current;

    const timeDelta = (timeElapsed - lastTimeRef.current) / 1000; 
    let speed = 0;
    
    if (timeDelta > 0 && lastTimeRef.current > 0) {
      speed = (distanceM - lastDistanceRef.current) / timeDelta;
      speed = Math.max(0, Math.min(speed, 15)); // Cap at 15m/s to filter noise
    }

    const newDataPoint: DataPoint = {
      timestamp: timeElapsed,
      distance: distanceM,
      speed: speed
    };

    dataBufferRef.current.push(newDataPoint);
    setData(prev => [...prev, newDataPoint]);

    lastDistanceRef.current = distanceM;
    lastTimeRef.current = timeElapsed;

    // Auto-Stop Logic
    let shouldStop = false;

    // 1. Acceleration Test
    if (testType === TestType.ACCELERATION && distanceM >= targetDist) shouldStop = true;

    // 2. Fly Test
    if (testType === TestType.FLY && distanceM >= (runUpDist + flyDist)) shouldStop = true;

    // 3. Jump Tests (PV/LJ) - Stop when reaching the calibrated board location
    if ((testType === TestType.POLE_VAULT || testType === TestType.LONG_JUMP) && boardLocation && distanceM >= boardLocation) {
        shouldStop = true;
    }

    // 4. 40 Yard Dash - Auto-stop at 40 yards (36.576m)
    if (testType === TestType.FORTY_YARD_DASH && distanceM >= 36.576) {
        shouldStop = true;
    }

    // 5. 60 Meter Run - Auto-stop at 60m
    if (testType === TestType.SIXTY_METER_RUN && distanceM >= 60) {
        shouldStop = true;
    }

    if (shouldStop) {
        stopRecording();
    }

  }, [testType, targetDist, runUpDist, flyDist, boardLocation]); 

  useEffect(() => {
    handleDataRef.current = handleSerialData;
  }, [handleSerialData]);

  useEffect(() => {
    serialService.setOnData(handleSerialData);
    serialService.setOnStatus(setStatus);
    return () => { if (simInterval) clearInterval(simInterval); };
  }, [handleSerialData, simInterval]);

  const toggleConnection = async () => {
    if (isConnected) {
      await serialService.disconnect();
      setIsConnected(false);
    } else {
      try {
        await serialService.connect();
        setIsConnected(true);
      } catch (e: any) {
        console.error(e);
        if (e.message?.includes('Permissions policy')) {
            alert("Connection Blocked: The browser's permission policy prevented the Serial connection. Please ensure this app is running in a secure context (HTTPS) or a compatible environment.");
        } else if (e.name === 'NotFoundError') {
            // User cancelled
        } else {
            alert("Failed to connect: " + (e.message || "Unknown error"));
        }
      }
    }
  };

  const toggleSimulation = () => {
    if (isConnected) return;

    if (simInterval) {
      clearInterval(simInterval);
      setSimInterval(null);
      setStatus('Ready');
      if (isRecording) stopRecording();
    } else {
      setStatus('Demo Mode Active');
      // FAKE DATA GENERATOR - Randomized per run for varied testing
      let simStartTime = 0;
      let REACTION_DELAY = 0;
      let V_MAX = 0;
      let TAU = 0;

      const interval = window.setInterval(() => {
        // In calibration mode, we still want fake data to move around a bit to simulate a person standing there
        if (!isRecordingRef.current) {
            // Simulating a person standing at ~40m for calibration
            const noise = (Math.random() - 0.5) * 0.1;
            if (handleDataRef.current) handleDataRef.current(4000 + noise * 100);
            simStartTime = 0;
            return;
        }

        // Initialize run parameters once at start of each run
        if (simStartTime === 0) {
            simStartTime = performance.now();
            // Randomize athlete characteristics for varied testing
            REACTION_DELAY = 0.15 + Math.random() * 0.25; // 0.15-0.40s (realistic sprint reaction times)
            V_MAX = 9.0 + Math.random() * 3.0; // 9.0-12.0 m/s (varied athlete speeds)
            TAU = 1.0 + Math.random() * 0.6; // 1.0-1.6s (varied acceleration profiles)
        }

        const now = performance.now();
        const runDuration = (now - simStartTime) / 1000;

        let distanceM = 0;
        if (runDuration > REACTION_DELAY) {
            const t = runDuration - REACTION_DELAY;
            distanceM = V_MAX * (t - TAU * (1 - Math.exp(-t / TAU)));
            // Add small random noise to simulate real sensor variation
            distanceM += (Math.random() - 0.5) * 0.02;
        }

        // In Simulation, allow it to go slightly past target distances
        if ((testType === TestType.LONG_JUMP || testType === TestType.POLE_VAULT) && distanceM > 45) {
             distanceM = 45;
        }
        if (testType === TestType.FORTY_YARD_DASH && distanceM > 40) {
             distanceM = 40;
        }
        if (testType === TestType.SIXTY_METER_RUN && distanceM > 65) {
             distanceM = 65;
        }

        const distCm = Math.floor(Math.max(0, distanceM * 100));
        if (handleDataRef.current) handleDataRef.current(distCm);
      }, 20);
      setSimInterval(interval);
    }
  };

  const startRecording = () => {
    setData([]);
    dataBufferRef.current = [];
    startTimeRef.current = performance.now();
    lastDistanceRef.current = 0;
    lastTimeRef.current = 0;
    setLastResult(null);
    
    // NOTE: We do NOT clear jumpMetric/Notes/stepCount here anymore.
    // This allows coaches to pre-fill data before the jump.
    setShowResultEntry(false);
    setRunFinished(false);

    setIsRecording(true);
    setStatus('Recording...');
  };

  const stopRecording = () => {
    setIsRecording(false);
    setStatus('Finished');
    setRunFinished(true);
    
    const res = calculateResult(dataBufferRef.current, testType, targetDist, runUpDist, flyDist);
    if (res) setLastResult(res);

    // Trigger Result Entry Panel for Jumps
    if (testType === TestType.POLE_VAULT || testType === TestType.LONG_JUMP) {
        
        // Auto-Detect Takeoff
        if (dataBufferRef.current.length > 0) {
             const maxDist = Math.max(...dataBufferRef.current.map(d => d.distance));
             setDetectedTakeoff(maxDist);
        } else {
             setDetectedTakeoff(null);
        }
        setShowResultEntry(true);
    }
  };

  const saveRun = () => {
    if (!selectedAthleteId) return;
    
    const config: TestConfig = {
        type: testType,
        targetDistance: testType === TestType.ACCELERATION ? targetDist : undefined,
        runUpDistance: testType === TestType.FLY ? runUpDist : undefined,
        flyDistance: testType === TestType.FLY ? flyDist : undefined,
        boardLocation: boardLocation || undefined
    };

    const session: RunSession = {
      id: Date.now().toString(),
      athleteId: selectedAthleteId,
      date: new Date().toISOString(),
      data: data,
      config,
      notes: runNotes || undefined,
    };

    if ((testType === TestType.POLE_VAULT || testType === TestType.LONG_JUMP) && jumpMetric) {
        session.jumpResult = {
            resultMetric: Number(jumpMetric),
            successful: testType === TestType.POLE_VAULT && jumpSuccess !== null ? jumpSuccess : undefined,
            boardLocation: boardLocation || undefined,
            takeoffLocation: detectedTakeoff || undefined,
            stepCount: stepCount ? Number(stepCount) : undefined
        };
    }

    onSaveSession(session);
    
    // Cleanup after save
    setData([]);
    setLastResult(null);
    setJumpMetric('');
    setStepCount('');
    setRunNotes('');
    setJumpSuccess(null);
    setShowResultEntry(false);
    setRunFinished(false);
    setStatus('Ready');
  };

  const discardRun = () => {
      setData([]);
      setLastResult(null);
      setJumpMetric('');
      setStepCount('');
      setRunNotes('');
      setJumpSuccess(null);
      setShowResultEntry(false);
      setRunFinished(false);
      setStatus('Ready');
  };

  const handleReassignRun = (run: RunSession, newAthleteId: string) => {
      const updatedRun = { ...run, athleteId: newAthleteId };
      onUpdateRun(updatedRun);
      setEditingRunId(null);
  };

  const toggleTempAthlete = (id: string) => {
    if (tempSelectedIds.includes(id)) {
      setTempSelectedIds(tempSelectedIds.filter(i => i !== id));
    } else {
      setTempSelectedIds([...tempSelectedIds, id]);
    }
  };

  const handleCreateAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    const newAthlete: Athlete = {
        id: Date.now().toString(),
        name: newName,
        email: newEmail || undefined,
        gender: newGender,
        dob: newDob || undefined,
        primaryEvent: newEvent || undefined
    };
    
    onCreateAthlete(newAthlete);
    setTempSelectedIds(prev => [...prev, newAthlete.id]);
    setNewName('');
    setNewEmail('');
    setNewDob('');
    setNewEvent('');
    setShowCreateForm(false);
  };

  const saveAthletes = () => {
    onUpdateSessionAthletes(tempSelectedIds);
    setIsManageModalOpen(false);
  };

  const confirmCalibration = () => {
      setBoardLocation(liveDistance);
      setStatus(`Board Set at ${liveDistance.toFixed(2)}m`);
      setShowCalibrationModal(false);
  };

  // Toggle helper for Make/Miss
  const toggleJumpSuccess = (val: boolean) => {
      setJumpSuccess(current => current === val ? null : val);
  };

  const currentSpeedRaw = data.length > 0 ? data[data.length - 1].speed : 0;
  const currentDistRaw = data.length > 0 ? data[data.length - 1].distance : 0;

  const displaySpeed = convertSpeed(currentSpeedRaw, settings.speedUnit);
  const displayDist = convertDist(currentDistRaw, settings.distanceUnit);

  const filteredAllAthletes = allAthletes.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = React.useMemo(() => {
      if (!boardLocation) return data;
      return data.map(d => ({
          ...d,
          relativeDist: -(boardLocation - d.distance)
      }));
  }, [data, boardLocation]);

  // Determine if Log Result button should be visible
  // Only show Log Result button if not recording AND not finished/pending save
  // But wait... user wants to be able to log result BEFORE run starts?
  // The prompt said: "make the log result thing also visible before the laser has measured"
  // So we keep it visible if !isRecording.
  // BUT: prompt also said "don't include the start run button... until previous run has saved/discarded"
  
  const isJumpTest = testType === TestType.POLE_VAULT || testType === TestType.LONG_JUMP;
  const showLogButton = !isRecording && isJumpTest;

  return (
    <div className="flex h-full gap-6 relative">
      
      {/* Calibration Modal */}
      {showCalibrationModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-[#E9E9E7] animate-in zoom-in-95">
                  <div className="mb-6">
                      <div className="w-16 h-16 bg-[#F7F7F5] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E9E9E7]">
                         <Crosshair size={32} className="text-[#37352F]" />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-[#37352F]">Calibrate Takeoff</h3>
                      <p className="text-sm text-[#787774] mt-2">
                          Stand at the takeoff board/box. <br/>The laser should be pointing at you.
                      </p>
                  </div>

                  <div className="bg-[#37352F] text-white rounded-lg p-8 mb-6 shadow-inner">
                      <div className="text-6xl font-mono font-bold tracking-tighter">
                          {liveDistance.toFixed(2)}<span className="text-2xl text-gray-400">m</span>
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mt-2 animate-pulse">Live Laser Reading</div>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setShowCalibrationModal(false)} className="flex-1 py-3 rounded text-[#787774] font-medium hover:bg-[#F7F7F5] transition-colors">Cancel</button>
                      <button onClick={confirmCalibration} className="flex-[2] py-3 bg-[#37352F] text-white rounded font-medium shadow-sm hover:bg-[#2F2F2F] transition-colors flex items-center justify-center gap-2">
                          <Check size={18} /> Set as Board
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Manage Athletes Modal (unchanged) */}
      {isManageModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
             <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl m-4 flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-[#E9E9E7] flex justify-between items-center bg-[#F7F7F5] rounded-t-lg">
                      <h3 className="font-serif font-bold text-[#37352F] text-lg">Manage Session Athletes</h3>
                      <button onClick={() => setIsManageModalOpen(false)} className="p-1 hover:bg-[#E9E9E7] rounded"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                        <div className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9A97]" size={16} />
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="Search athletes..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-[#F7F7F5] border border-[#E9E9E7] rounded text-sm focus:outline-none focus:border-[#37352F]"
                                    />
                                </div>
                                <button onClick={() => setShowCreateForm(!showCreateForm)} className="px-4 py-2 bg-[#37352F] text-white rounded text-sm font-medium flex items-center gap-2"><Plus size={16} /> New</button>
                        </div>
                        {showCreateForm && (
                            <div className="bg-[#F7F7F5] p-4 rounded border border-[#E9E9E7] mb-4">
                                <form onSubmit={handleCreateAthlete} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                     <input placeholder="Full Name *" required value={newName} onChange={e => setNewName(e.target.value)} className="bg-white border border-[#E9E9E7] rounded p-2 text-xs outline-none" />
                                     <button type="submit" className="col-span-2 bg-[#37352F] text-white px-3 py-1.5 rounded text-xs font-medium">Create</button>
                                </form>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {filteredAllAthletes.map(athlete => (
                              <div key={athlete.id} onClick={() => toggleTempAthlete(athlete.id)} className={`flex items-center p-2 rounded cursor-pointer border ${tempSelectedIds.includes(athlete.id) ? 'bg-green-50 border-green-200' : 'bg-white border-transparent'}`}>
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${tempSelectedIds.includes(athlete.id) ? 'bg-green-500 border-green-500' : 'border-[#E9E9E7]'}`}>{tempSelectedIds.includes(athlete.id) && <Check size={12} className="text-white"/>}</div>
                                  <div className="text-sm font-medium">{athlete.name}</div>
                              </div>
                          ))}
                        </div>
                  </div>
                  <div className="p-4 border-t border-[#E9E9E7] flex justify-end gap-3">
                      <button onClick={() => setIsManageModalOpen(false)} className="px-4 py-2 text-sm text-[#787774] hover:bg-[#F7F7F5] rounded">Cancel</button>
                      <button onClick={saveAthletes} className="px-6 py-2 text-sm bg-[#37352F] text-white rounded">Update Session</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Top Controls */}
        <div className="mb-4 bg-white sticky top-0 z-10 pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <div className="text-xs text-[#787774] font-bold uppercase tracking-wider mb-1">Active Session</div>
                    <h2 className="text-xl font-serif font-bold text-[#37352F]">{activeSession.name}</h2>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setShowSessionLog(!showSessionLog)} className="md:hidden p-2 border rounded text-[#787774]"><List size={16}/></button>
                    {!isConnected && (
                        <button onClick={toggleSimulation} className={`px-3 py-1.5 text-sm rounded border transition-colors ${simInterval ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-[#E9E9E7] text-[#37352F] hover:bg-[#F7F7F5]'}`}>
                            {simInterval ? 'Stop Demo' : 'Demo Mode'}
                        </button>
                    )}
                    <button onClick={toggleConnection} className={`px-3 py-1.5 text-sm rounded border flex items-center gap-2 transition-colors ${isConnected ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#37352F] border-[#37352F] text-white hover:bg-[#2F2F2F]'}`}>
                        {isConnected ? <><WifiOff size={14}/></> : <><Wifi size={14}/> Connect</>}
                    </button>
                    <button onClick={onEndSession} className="px-3 py-1.5 text-sm rounded border border-[#E9E9E7] text-[#37352F] hover:bg-red-50 hover:text-red-600 transition-colors ml-2 font-medium">Finish</button>
                </div>
            </div>

            {/* Athlete Chips */}
            <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar items-center mb-2">
                {availableAthletes.map(a => (
                    <button 
                        key={a.id}
                        onClick={() => setSelectedAthleteId(a.id)}
                        className={`flex-shrink-0 flex items-center gap-3 pl-2 pr-4 py-2 rounded-full border transition-all ${a.id === selectedAthleteId ? 'bg-[#37352F] text-white border-[#37352F] shadow-sm' : 'bg-white border-[#E9E9E7] text-[#37352F] hover:bg-[#F7F7F5]'}`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${a.id === selectedAthleteId ? 'bg-white text-[#37352F]' : 'bg-[#F7F7F5] text-[#787774]'}`}>{a.name.charAt(0)}</div>
                        <span className="text-sm font-medium whitespace-nowrap">{a.name}</span>
                    </button>
                ))}
                <button onClick={() => setIsManageModalOpen(true)} className="flex-shrink-0 w-10 h-10 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center text-[#787774] hover:bg-[#EFEFED] transition-colors"><Plus size={18} /></button>
            </div>
        </div>
        
        {/* Config Bar */}
        <div className="mb-4">
             <div className="flex items-center gap-3">
                 <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 text-[#37352F] hover:bg-[#F7F7F5] px-3 py-1.5 rounded transition-colors border border-transparent hover:border-[#E9E9E7]">
                    <span className="font-bold text-lg font-serif">{TEST_TYPES[testType].label}</span>
                    <ChevronDown size={16} className={`text-[#9B9A97] transition-transform ${showConfig ? 'rotate-180' : ''}`} />
                 </button>
                 {(testType === TestType.LONG_JUMP || testType === TestType.POLE_VAULT) && (
                    <button onClick={() => setShowCalibrationModal(true)} className={`flex items-center gap-2 border px-3 py-1.5 rounded text-xs transition-colors ${boardLocation ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-[#E9E9E7] hover:bg-[#F7F7F5]'}`}>
                        <Target size={12}/> {boardLocation ? 'Reset Board' : 'Calibrate Board'}
                    </button>
                 )}
            </div>
            
            {/* Expanded Config Panel */}
            {showConfig && (
                <div className="mt-3 p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-lg animate-in slide-in-from-top-2">
                    <h3 className="text-xs font-bold text-[#9B9A97] uppercase mb-3">Test Configuration</h3>
                    <div className="flex flex-wrap gap-6">
                        <div>
                            <label className="block text-xs font-medium text-[#37352F] mb-1">Measurement Type</label>
                            <select 
                                value={testType}
                                onChange={(e) => setTestType(e.target.value as TestType)}
                                className="bg-white border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F] min-w-[200px]"
                            >
                                {Object.entries(TEST_TYPES).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>

                        {testType === TestType.ACCELERATION && (
                            <div>
                                <label className="block text-xs font-medium text-[#37352F] mb-1">Target Distance (m)</label>
                                <input 
                                    type="number" 
                                    value={targetDist}
                                    onChange={e => setTargetDist(Number(e.target.value))}
                                    className="bg-white border border-[#E9E9E7] rounded px-3 py-2 text-sm w-24 outline-none focus:border-[#37352F]"
                                />
                            </div>
                        )}

                        {testType === TestType.FLY && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-[#37352F] mb-1">Run Up (m)</label>
                                    <input 
                                        type="number" 
                                        value={runUpDist}
                                        onChange={e => setRunUpDist(Number(e.target.value))}
                                        className="bg-white border border-[#E9E9E7] rounded px-3 py-2 text-sm w-24 outline-none focus:border-[#37352F]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#37352F] mb-1">Fly Zone (m)</label>
                                    <input 
                                        type="number" 
                                        value={flyDist}
                                        onChange={e => setFlyDist(Number(e.target.value))}
                                        className="bg-white border border-[#E9E9E7] rounded px-3 py-2 text-sm w-24 outline-none focus:border-[#37352F]"
                                    />
                                </div>
                            </>
                        )}

                         {(testType === TestType.LONG_JUMP || testType === TestType.POLE_VAULT) && (
                            <div>
                                <label className="block text-xs font-medium text-[#37352F] mb-1">Board Location (m)</label>
                                <input 
                                    type="number" 
                                    value={boardLocation || ''}
                                    placeholder="Not set"
                                    onChange={e => setBoardLocation(Number(e.target.value))}
                                    className="bg-white border border-[#E9E9E7] rounded px-3 py-2 text-sm w-28 outline-none focus:border-[#37352F]"
                                />
                                <div className="text-[10px] text-[#9B9A97] mt-1">Or use Calibrate button</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-6 border border-[#E9E9E7] rounded bg-white shadow-sm flex flex-col items-center justify-center">
                <span className="text-[#9B9A97] text-xs uppercase font-medium mb-1">Speed</span>
                <div className="text-4xl md:text-5xl font-bold text-[#37352F] tabular-nums">{displaySpeed.toFixed(1)} <span className="text-lg text-[#9B9A97] font-normal">{UNIT_LABELS.speed[settings.speedUnit]}</span></div>
            </div>
            <div className="p-6 border border-[#E9E9E7] rounded bg-white shadow-sm flex flex-col items-center justify-center">
                <span className="text-[#9B9A97] text-xs uppercase font-medium mb-1">Distance</span>
                <div className="text-4xl md:text-5xl font-bold text-[#37352F] tabular-nums">{displayDist.toFixed(2)} <span className="text-lg text-[#9B9A97] font-normal">{UNIT_LABELS.distance[settings.distanceUnit]}</span></div>
            </div>
        </div>

        {/* Chart */}
        <div className="flex-1 border border-[#E9E9E7] rounded bg-white p-4 relative min-h-[250px] shadow-sm mb-6">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                <defs><linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#37352F" stopOpacity={0.1}/><stop offset="95%" stopColor="#37352F" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" vertical={false} />
                <XAxis dataKey={boardLocation ? "relativeDist" : "distance"} type="number" unit="m" domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{fill: '#9B9A97', fontSize: 12}} />
                <YAxis tickLine={false} axisLine={false} tick={{fill: '#9B9A97', fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E9E9E7' }} formatter={(val: any) => convertSpeed(Number(val), settings.speedUnit).toFixed(2)} />
                {boardLocation && <ReferenceLine x={0} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'TAKEOFF', fill: '#10B981', fontSize: 10, position: 'insideTop' }} />}
                <Area type="monotone" dataKey="speed" stroke="#37352F" strokeWidth={2} fill="url(#colorSpeed)" isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>

        {/* Action Area / Inline Result Panel */}
        {showResultEntry ? (
            <div className="bg-white rounded-lg border border-[#E9E9E7] shadow-md p-6 animate-in slide-in-from-bottom-4 fade-in">
                <div className="flex items-center justify-between mb-6 border-b border-[#E9E9E7] pb-4">
                     <h3 className="text-xl font-serif font-bold text-[#37352F]">Log Result</h3>
                     {testType === TestType.POLE_VAULT && (
                         <div className="flex bg-[#F7F7F5] rounded p-1 border border-[#E9E9E7]">
                             <button onClick={() => toggleJumpSuccess(true)} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${jumpSuccess === true ? 'bg-green-500 text-white shadow-sm' : 'text-[#9B9A97] hover:text-[#37352F]'}`}>MAKE</button>
                             <button onClick={() => toggleJumpSuccess(false)} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${jumpSuccess === false ? 'bg-red-500 text-white shadow-sm' : 'text-[#9B9A97] hover:text-[#37352F]'}`}>MISS</button>
                         </div>
                     )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                     <div>
                         <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-2">{testType === TestType.POLE_VAULT ? 'Bar Height' : 'Distance'} (m)</label>
                         <input 
                            autoFocus
                            type="number" 
                            step="0.01" 
                            value={jumpMetric} 
                            onChange={e => setJumpMetric(e.target.value)} 
                            placeholder="0.00" 
                            className="w-full text-3xl font-serif font-bold text-[#37352F] placeholder-gray-200 border-b border-[#E9E9E7] pb-2 outline-none focus:border-[#37352F] bg-transparent"
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-2">Step Count</label>
                         <div className="relative">
                            <Footprints className="absolute left-0 top-2 text-[#9B9A97]" size={20}/>
                            <input 
                                type="number" 
                                value={stepCount} 
                                onChange={e => setStepCount(e.target.value)} 
                                placeholder="e.g. 16" 
                                className="w-full pl-8 text-xl font-mono text-[#37352F] placeholder-gray-200 border-b border-[#E9E9E7] pb-2 outline-none focus:border-[#37352F] bg-transparent"
                            />
                         </div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-2">Notes</label>
                         <textarea 
                            value={runNotes} 
                            onChange={e => setRunNotes(e.target.value)} 
                            placeholder="Wind, technique..." 
                            className="w-full text-sm text-[#37352F] border-b border-[#E9E9E7] pb-2 outline-none focus:border-[#37352F] bg-transparent resize-none h-[42px]"
                         />
                     </div>
                </div>

                <div className="flex gap-4">
                     <button onClick={discardRun} className="flex-1 py-3 rounded text-[#787774] font-medium hover:bg-[#F7F7F5] transition-colors flex items-center justify-center gap-2"><Trash2 size={16}/> Discard</button>
                     <button onClick={saveRun} className="flex-[2] py-3 bg-[#37352F] text-white rounded font-medium shadow-sm hover:bg-[#2F2F2F] transition-colors flex items-center justify-center gap-2"><Save size={16}/> Save Log</button>
                </div>
            </div>
        ) : (
            <div className="flex items-center justify-between p-4 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#9B9A97]'}`} />
                    <span className="text-sm font-mono text-[#787774]">{status}</span>
                </div>
                <div className="flex gap-3 items-center">
                    {!isRecording ? (
                        <>
                            {/* Free Run Save Controls */}
                            {runFinished && !showLogButton ? (
                                <>
                                    <div className="relative w-64 mr-2">
                                        <ClipboardPen className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9B9A97]" size={14} />
                                        <input 
                                            type="text" 
                                            value={runNotes}
                                            onChange={e => setRunNotes(e.target.value)}
                                            placeholder="Add note..."
                                            className="w-full pl-8 pr-3 py-2 rounded border border-[#E9E9E7] text-sm focus:outline-none focus:border-[#37352F]"
                                        />
                                    </div>
                                    <button onClick={saveRun} className="bg-[#37352F] text-white px-4 py-2.5 rounded hover:bg-black transition-colors font-medium flex items-center gap-2 shadow-sm text-sm">
                                        <Save size={14} /> Save
                                    </button>
                                    <button onClick={discardRun} className="text-[#787774] hover:text-red-600 px-2 py-2 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="w-px h-6 bg-[#E9E9E7] mx-1"></div>
                                </>
                            ) : (
                                // Only show Start Run if NOT finished (meaning fresh state or discarded previous)
                                <button onClick={startRecording} disabled={!isConnected && !simInterval} className="bg-[#37352F] text-white px-8 py-2.5 rounded hover:bg-black disabled:opacity-50 transition-colors font-medium flex items-center gap-2 shadow-sm">
                                    <Play size={16} fill="currentColor"/> Start Run
                                </button>
                            )}
                            
                            {showLogButton && (
                                <button onClick={() => setShowResultEntry(true)} className="px-4 py-2 border border-[#E9E9E7] bg-white rounded hover:bg-[#F7F7F5] text-sm text-[#37352F] font-medium">Log Result</button>
                            )}
                        </>
                    ) : (
                        <button onClick={stopRecording} className="bg-white border border-red-200 text-red-600 px-8 py-2.5 rounded hover:bg-red-50 transition-colors font-medium flex items-center gap-2 shadow-sm">
                            <Square size={16} fill="currentColor"/> Stop
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>
      
      {/* Session Log Sidebar (Existing) */}
      <div className={`w-80 flex-shrink-0 border-l border-[#E9E9E7] bg-[#F7F7F5] flex flex-col ${showSessionLog ? 'fixed inset-0 z-50 bg-white md:relative md:bg-[#F7F7F5] md:z-auto' : 'hidden md:flex'}`}>
         {/* ... Sidebar Content (Same as before) ... */}
         <div className="p-4 border-b border-[#E9E9E7] flex justify-between items-center">
             <h3 className="font-bold font-serif text-[#37352F]">Session Log</h3>
             <button onClick={() => setShowSessionLog(false)} className="md:hidden"><LogOut size={16}/></button>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {activeSession.runs.length === 0 ? (
                <div className="text-center p-8 text-[#9B9A97] text-sm italic">No runs yet.</div>
            ) : (
                activeSession.runs.map((run, idx) => {
                    const a = availableAthletes.find(at => at.id === run.athleteId) || allAthletes.find(at => at.id === run.athleteId);
                    return (
                        <div key={run.id} className="bg-white border border-[#E9E9E7] p-3 rounded hover:border-[#37352F] transition-colors relative group">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-[#9B9A97]">#{activeSession.runs.length - idx}</span>
                                <span className="text-[10px] text-[#9B9A97]">{new Date(run.date).toLocaleTimeString()}</span>
                            </div>
                            <div className="font-medium text-[#37352F] mb-1 flex items-center gap-2">
                                    <span onClick={() => onViewRun(run)} className="cursor-pointer hover:underline">{a?.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingRunId(run.id); }} className="text-[#9B9A97] opacity-0 group-hover:opacity-100 hover:text-[#37352F] p-1"><Edit2 size={10} /></button>
                            </div>
                            <div onClick={() => onViewRun(run)} className="flex justify-between items-end cursor-pointer">
                                <span className="text-xs bg-[#F7F7F5] px-1.5 py-0.5 rounded border border-[#E9E9E7]">{run.config.type === TestType.POLE_VAULT ? 'PV' : run.config.type === TestType.LONG_JUMP ? 'LJ' : run.config.type}</span>
                                <div className="text-right">
                                    {run.jumpResult ? (
                                        <div className="flex flex-col items-end">
                                            <span className={`font-bold text-sm ${run.jumpResult.successful === false ? 'text-red-600' : 'text-[#37352F]'}`}>
                                                {run.jumpResult.resultMetric}m {run.jumpResult.successful === false && '(X)'}
                                            </span>
                                            {run.jumpResult.stepCount && <span className="text-[10px] text-[#9B9A97]">{run.jumpResult.stepCount} steps</span>}
                                        </div>
                                    ) : (
                                        <span className="font-mono font-bold text-[#37352F]">{convertSpeed(Math.max(...run.data.map(d=>d.speed)), settings.speedUnit).toFixed(1)} {UNIT_LABELS.speed[settings.speedUnit]}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
         </div>
      </div>
    </div>
  );
};

export default LiveRun;
