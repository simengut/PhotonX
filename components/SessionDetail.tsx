
import React, { useState } from 'react';
import { TrainingSession, Athlete, AppSettings, RunSession, TestType } from '../types';
import { UNIT_LABELS } from '../constants';
import { ArrowLeft, Play, Edit2, Trash2, Calendar, Users, Clock, Save, Check, X, AlertTriangle, FileDown } from 'lucide-react';
import { generateSessionReport } from '../services/pdfReportsEnhanced';

interface SessionDetailProps {
  session: TrainingSession;
  athletes: Athlete[];
  settings: AppSettings;
  onBack: () => void;
  onResume: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onUpdateName: (sessionId: string, name: string) => void;
  onSelectRun: (run: RunSession) => void;
}

const SessionDetail: React.FC<SessionDetailProps> = ({ session, athletes, settings, onBack, onResume, onDelete, onUpdateName, onSelectRun }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const saveName = () => {
    onUpdateName(session.id, editName);
    setIsEditing(false);
  };

  // Stats Calculation
  const totalRuns = session.runs.length;
  const athletesInSession = athletes.filter(a => session.athleteIds.includes(a.id));
  
  // Find best performances (e.g. top speed of session)
  let maxSpeedOverall = 0;
  let topAthlete = '';
  
  session.runs.forEach(r => {
      const max = r.data.reduce((acc, curr) => Math.max(acc, curr.speed), 0);
      if (max > maxSpeedOverall) {
          maxSpeedOverall = max;
          const a = athletes.find(at => at.id === r.athleteId);
          topAthlete = a ? a.name : 'Unknown';
      }
  });

  const displayMaxSpeed = maxSpeedOverall * (settings.speedUnit === 'kph' ? 3.6 : settings.speedUnit === 'mph' ? 2.237 : 1);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      
      {/* Custom Delete Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
              <div className="bg-white p-6 rounded-xl shadow-2xl border border-red-100 max-w-md w-full m-4 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-4 text-red-600">
                      <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                        <AlertTriangle size={20} />
                      </div>
                      <h3 className="text-lg font-serif font-bold text-[#37352F]">Delete Session?</h3>
                  </div>
                  <p className="text-sm text-[#787774] mb-6 leading-relaxed">
                      Are you sure you want to delete <span className="font-bold text-[#37352F]">"{session.name}"</span>?<br/>
                      This will permanently remove all run data associated with this session. This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setShowDeleteModal(false)}
                          className="flex-1 px-4 py-2.5 rounded text-sm font-medium text-[#787774] hover:bg-[#F7F7F5] transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={() => onDelete(session.id)}
                          className="flex-1 px-4 py-2.5 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                          <Trash2 size={16} /> Delete Permanently
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
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-[#E9E9E7] pb-6">
            <div className="flex-1">
                {isEditing ? (
                    <div className="flex items-center gap-2 mb-2">
                        <input 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)}
                            className="text-3xl font-serif font-bold text-[#37352F] border-b-2 border-[#37352F] outline-none bg-transparent w-full"
                            autoFocus
                        />
                        <button onClick={saveName} className="p-2 bg-[#37352F] text-white rounded"><Check size={16}/></button>
                        <button onClick={() => { setIsEditing(false); setEditName(session.name); }} className="p-2 bg-gray-200 text-gray-600 rounded"><X size={16}/></button>
                    </div>
                ) : (
                    <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2 flex items-center gap-3 group">
                        {session.name}
                        <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#37352F] transition-opacity">
                            <Edit2 size={18} />
                        </button>
                    </h1>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-[#787774]">
                    <div className="flex items-center gap-1.5"><Calendar size={14}/> {new Date(session.date).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5"><Clock size={14}/> {new Date(session.date).toLocaleTimeString()}</div>
                    <div className="flex items-center gap-1.5"><Users size={14}/> {athletesInSession.length} Athletes</div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => generateSessionReport(session, athletes, settings)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 shadow-sm"
                >
                    <FileDown size={16} /> Download Report
                </button>
                <button
                    onClick={() => onResume(session.id)}
                    className="flex items-center gap-2 bg-[#37352F] text-white px-4 py-2 rounded font-medium hover:bg-[#2F2F2F] shadow-sm"
                >
                    <Play size={16} /> Resume
                </button>
                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 bg-white text-red-600 border border-red-200 px-3 py-1.5 text-xs rounded font-medium hover:bg-red-50"
                >
                    <Trash2 size={14} /> Delete
                </button>
            </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#F7F7F5] p-4 rounded-lg border border-[#E9E9E7]">
              <div className="text-xs font-bold text-[#9B9A97] uppercase mb-1">Total Runs</div>
              <div className="text-3xl font-bold text-[#37352F]">{totalRuns}</div>
          </div>
           <div className="bg-[#F7F7F5] p-4 rounded-lg border border-[#E9E9E7]">
              <div className="text-xs font-bold text-[#9B9A97] uppercase mb-1">Top Speed</div>
              <div className="text-3xl font-bold text-[#37352F]">
                {displayMaxSpeed.toFixed(2)} <span className="text-sm text-[#9B9A97] font-normal">{UNIT_LABELS.speed[settings.speedUnit]}</span>
              </div>
              <div className="text-[10px] text-[#9B9A97] mt-1">By {topAthlete}</div>
          </div>
          <div className="bg-[#F7F7F5] p-4 rounded-lg border border-[#E9E9E7]">
              <div className="text-xs font-bold text-[#9B9A97] uppercase mb-1">Status</div>
              <div className="text-3xl font-bold text-[#37352F] capitalize">{session.status.toLowerCase()}</div>
          </div>
      </div>

      {/* Run List */}
      <div>
          <h3 className="text-lg font-bold font-serif text-[#37352F] mb-4">Runs Recorded</h3>
          <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-[#F7F7F5] border-b border-[#E9E9E7]">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium text-[#787774]">Time</th>
                        <th className="px-4 py-3 text-left font-medium text-[#787774]">Athlete</th>
                        <th className="px-4 py-3 text-left font-medium text-[#787774]">Type</th>
                        <th className="px-4 py-3 text-right font-medium text-[#787774]">Result / Speed</th>
                        <th className="px-4 py-3 text-right font-medium text-[#787774]">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E9E7]">
                    {session.runs.map((run, idx) => {
                        const athlete = athletes.find(a => a.id === run.athleteId);
                        const maxSpd = run.data.length > 0 ? Math.max(...run.data.map(d => d.speed)) : 0;
                        const displaySpd = maxSpd * (settings.speedUnit === 'kph' ? 3.6 : settings.speedUnit === 'mph' ? 2.237 : 1);

                        return (
                            <tr key={run.id} className="hover:bg-[#F7F7F5] transition-colors cursor-pointer" onClick={() => onSelectRun(run)}>
                                <td className="px-4 py-3 text-[#9B9A97] font-mono">{new Date(run.date).toLocaleTimeString()}</td>
                                <td className="px-4 py-3 font-medium text-[#37352F]">{athlete?.name || 'Unknown'}</td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                        {run.config.type === TestType.POLE_VAULT ? 'PV' : run.config.type === TestType.LONG_JUMP ? 'LJ' : run.config.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-[#37352F]">
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold">
                                            {displaySpd.toFixed(2)} <span className="text-[10px] text-gray-400 font-sans">{UNIT_LABELS.speed[settings.speedUnit]}</span>
                                        </span>
                                        {run.jumpResult && (
                                            <span className={`text-[10px] ${run.jumpResult.successful === false ? 'text-red-500' : 'text-gray-400'}`}>
                                                {run.config.type === TestType.POLE_VAULT ? 'Bar: ' : 'Dist: '}{run.jumpResult.resultMetric}m
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button className="text-[#37352F] hover:underline text-xs font-medium">Analyze</button>
                                </td>
                            </tr>
                        );
                    })}
                    {session.runs.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">No runs recorded in this session yet.</td>
                        </tr>
                    )}
                </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default SessionDetail;
