
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingSession, Athlete, AppSettings, TestType } from '../types';
import { Calendar, List, Search, Filter, ChevronRight, ChevronLeft, Users, Activity, Clock, Zap, Ruler, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp } from 'lucide-react';
import { UNIT_LABELS } from '../constants';

interface HistoryProps {
  sessions: TrainingSession[];
  athletes: Athlete[];
  settings: AppSettings;
  onSelectSession: (session: TrainingSession) => void;
  onDeleteSession: (id: string) => void; 
}

const History: React.FC<HistoryProps> = ({ sessions, athletes, settings, onSelectSession }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAthleteFilter, setSelectedAthleteFilter] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // State for expanded cards
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());

  // Filter Logic
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // 1. Text Search
      const term = searchTerm.toLowerCase();
      const athleteNames = athletes.filter(a => session.athleteIds.includes(a.id)).map(a => a.name.toLowerCase());
      const matchesSearch = 
        session.name.toLowerCase().includes(term) ||
        athleteNames.some(name => name.includes(term)) ||
        session.runs.some(r => r.notes?.toLowerCase().includes(term) || r.config.type.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      // 2. Athlete Filter
      if (selectedAthleteFilter && !session.athleteIds.includes(selectedAthleteFilter)) {
        return false;
      }

      return true;
    });
  }, [sessions, searchTerm, selectedAthleteFilter, athletes]);

  // Initialize default expanded state (Most recent open, others closed)
  useEffect(() => {
    if (sessions.length > 0) {
      setExpandedSessionIds(prev => {
          if (prev.size === 0) {
              return new Set([sessions[0].id]);
          }
          return prev;
      });
    }
  }, [sessions]);

  const toggleSessionExpand = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation(); // Prevent navigating to details
      setExpandedSessionIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(sessionId)) {
              newSet.delete(sessionId);
          } else {
              newSet.add(sessionId);
          }
          return newSet;
      });
  };

  const handleExpandAll = () => {
      const allIds = filteredSessions.map(s => s.id);
      setExpandedSessionIds(new Set(allIds));
  };

  const handleCollapseAll = () => {
      setExpandedSessionIds(new Set());
  };

  const convertSpeed = (mps: number, unit: string) => {
      if (unit === 'kph') return mps * 3.6;
      if (unit === 'mph') return mps * 2.23694;
      return mps;
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    return { days, firstDay, year, month };
  };

  const renderCalendar = () => {
    const { days, firstDay, year, month } = getDaysInMonth(currentMonth);
    const monthSessions = filteredSessions.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const grid = [];
    // Empty slots for prev month
    for (let i = 0; i < firstDay; i++) {
      grid.push(<div key={`empty-${i}`} className="h-32 bg-[#F7F7F5] border border-gray-100"></div>);
    }
    
    // Days
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySessions = monthSessions.filter(s => s.date.startsWith(dateStr) || new Date(s.date).getDate() === d);

      grid.push(
        <div key={d} className="h-32 bg-white border border-gray-100 p-2 hover:bg-gray-50 transition-colors relative overflow-hidden group">
           <div className="flex justify-between items-start">
             <span className={`text-xs font-bold ${daySessions.length > 0 ? 'text-[#37352F]' : 'text-gray-300'}`}>{d}</span>
             {daySessions.length > 0 && <div className="w-2 h-2 rounded-full bg-[#37352F]"></div>}
           </div>
           <div className="mt-1 space-y-1 overflow-y-auto h-24 pb-4">
              {daySessions.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => onSelectSession(s)}
                  className="text-[10px] bg-[#37352F] text-white p-1 rounded cursor-pointer hover:bg-black truncate shadow-sm"
                >
                  {s.name}
                </div>
              ))}
           </div>
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={20}/></button>
            <span className="font-serif font-bold text-lg">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20}/></button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
             <div key={day} className="bg-[#F7F7F5] p-2 text-xs font-bold text-center text-gray-500 uppercase">{day}</div>
           ))}
           {grid}
        </div>
      </div>
    );
  };

  return (
    <div>
       <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
              <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2">History</h1>
              <p className="text-[#787774]">Review past performances.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-end">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-[#E9E9E7] rounded-md text-sm outline-none focus:border-[#37352F]"
                      placeholder="Search sessions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              
              <div className="flex gap-2">
                  {/* Expand/Collapse Controls (List Mode Only) */}
                  {viewMode === 'LIST' && (
                      <div className="flex bg-[#F7F7F5] p-1 rounded border border-[#E9E9E7]">
                           <button 
                                onClick={handleExpandAll} 
                                className="p-1.5 rounded text-gray-500 hover:bg-white hover:text-[#37352F] hover:shadow-sm transition-all"
                                title="Expand All"
                           >
                                <ChevronsDown size={18} />
                           </button>
                           <button 
                                onClick={handleCollapseAll} 
                                className="p-1.5 rounded text-gray-500 hover:bg-white hover:text-[#37352F] hover:shadow-sm transition-all"
                                title="Collapse All"
                           >
                                <ChevronsUp size={18} />
                           </button>
                      </div>
                  )}

                  {/* View Toggle */}
                  <div className="flex bg-[#F7F7F5] p-1 rounded border border-[#E9E9E7]">
                      <button 
                        onClick={() => setViewMode('LIST')} 
                        className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-white shadow-sm text-[#37352F]' : 'text-gray-400 hover:text-[#37352F]'}`}
                      >
                        <List size={18} />
                      </button>
                      <button 
                        onClick={() => setViewMode('CALENDAR')} 
                        className={`p-1.5 rounded ${viewMode === 'CALENDAR' ? 'bg-white shadow-sm text-[#37352F]' : 'text-gray-400 hover:text-[#37352F]'}`}
                      >
                        <Calendar size={18} />
                      </button>
                  </div>
              </div>
          </div>
       </div>

       {/* Filter Bar */}
       <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-bold uppercase text-gray-400 mr-2">Filter By:</span>
          <select 
            value={selectedAthleteFilter} 
            onChange={(e) => setSelectedAthleteFilter(e.target.value)}
            className="text-sm border border-[#E9E9E7] rounded px-2 py-1 bg-white focus:border-[#37352F] outline-none"
          >
             <option value="">All Athletes</option>
             {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
       </div>

       {viewMode === 'CALENDAR' ? renderCalendar() : (
         <div className="space-y-6">
             {filteredSessions.length === 0 && (
                 <div className="text-center py-12 bg-[#F7F7F5] rounded-lg border border-dashed border-[#E9E9E7]">
                     <p className="text-[#9B9A97]">No sessions found matching your criteria.</p>
                 </div>
             )}

             {filteredSessions.map(session => {
                 const participatingAthletes = athletes.filter(a => session.athleteIds.includes(a.id));
                 const athleteNames = participatingAthletes.map(a => a.name).join(', ');
                 const isExpanded = expandedSessionIds.has(session.id);

                 return (
                     <div key={session.id} className="bg-white border border-[#E9E9E7] rounded-xl shadow-sm overflow-hidden hover:border-[#37352F] transition-colors group">
                         
                         {/* Session Header */}
                         <div className="p-4 bg-[#F7F7F5] border-b border-[#E9E9E7] flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer" onClick={() => onSelectSession(session)}>
                             <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-1">
                                     <h3 className="text-lg font-serif font-bold text-[#37352F] group-hover:underline">{session.name}</h3>
                                     <span className={`text-[10px] px-2 py-0.5 rounded-full border ${session.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-200 text-gray-600 border-gray-300'}`}>
                                         {session.status}
                                     </span>
                                 </div>
                                 <div className="flex items-center gap-4 text-xs text-[#787774]">
                                     <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(session.date).toLocaleDateString()}</span>
                                     <span className="flex items-center gap-1"><Clock size={12}/> {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                     <span className="flex items-center gap-1"><Users size={12}/> {participatingAthletes.length} Athletes</span>
                                 </div>
                             </div>

                             <div className="flex items-center gap-4">
                                 <div className="hidden sm:flex items-center gap-2">
                                     <span className="text-sm font-medium text-[#37352F] max-w-[200px] truncate text-right" title={athleteNames}>
                                         {participatingAthletes.length > 0 ? athleteNames : 'No Athletes'}
                                     </span>
                                 </div>
                                 <div className="h-8 w-px bg-gray-300 mx-2 hidden sm:block"></div>
                                 
                                 {/* Expand/Collapse Toggle */}
                                 <button 
                                    onClick={(e) => toggleSessionExpand(e, session.id)}
                                    className="p-2 rounded hover:bg-white text-[#37352F] transition-colors"
                                 >
                                     {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                 </button>
                             </div>
                         </div>

                         {/* Embedded Runs List (Collapsible) */}
                         {isExpanded && (
                             <div className="bg-white animate-in slide-in-from-top-2 duration-200">
                                 {session.runs.length === 0 ? (
                                     <div className="p-4 text-center text-xs text-[#9B9A97] italic">No runs recorded.</div>
                                 ) : (
                                     <table className="w-full text-sm">
                                         <thead className="bg-white text-[#9B9A97] font-bold uppercase text-[10px] border-b border-[#E9E9E7]">
                                             <tr>
                                                 <th className="px-4 py-2 text-left font-normal">Time</th>
                                                 <th className="px-4 py-2 text-left font-normal">Athlete</th>
                                                 <th className="px-4 py-2 text-left font-normal">Test</th>
                                                 <th className="px-4 py-2 text-right font-normal">Result / Speed</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-[#E9E9E7]">
                                             {session.runs.map((run) => {
                                                 const athlete = athletes.find(a => a.id === run.athleteId);
                                                 const maxSpd = run.data.length > 0 ? Math.max(...run.data.map(d => d.speed)) : 0;
                                                 const displaySpd = convertSpeed(maxSpd, settings.speedUnit);
                                                 
                                                 return (
                                                     <tr key={run.id} className="hover:bg-[#F7F7F5] cursor-pointer" onClick={() => onSelectSession(session)}>
                                                         <td className="px-4 py-2 text-[#9B9A97] font-mono text-xs">{new Date(run.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                                         <td className="px-4 py-2 font-medium text-[#37352F]">{athlete?.name}</td>
                                                         <td className="px-4 py-2">
                                                             <span className="inline-flex items-center gap-1 text-xs text-[#787774]">
                                                                 {run.config.type === TestType.POLE_VAULT || run.config.type === TestType.LONG_JUMP ? <Ruler size={10}/> : <Zap size={10}/>}
                                                                 {run.config.type === TestType.POLE_VAULT ? 'PV' : run.config.type === TestType.LONG_JUMP ? 'LJ' : run.config.type.replace('_', ' ')}
                                                             </span>
                                                         </td>
                                                         <td className="px-4 py-2 text-right font-mono text-[#37352F]">
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-bold">
                                                                    {displaySpd.toFixed(1)} <span className="text-[10px] text-[#9B9A97] font-sans">{UNIT_LABELS.speed[settings.speedUnit]}</span>
                                                                </span>
                                                                {run.jumpResult && (
                                                                    <span className={`text-[10px] ${run.jumpResult.successful === false ? 'text-red-500' : 'text-[#9B9A97]'}`}>
                                                                        {run.config.type === TestType.POLE_VAULT ? 'Bar: ' : 'Dist: '}{run.jumpResult.resultMetric}m
                                                                    </span>
                                                                )}
                                                            </div>
                                                         </td>
                                                     </tr>
                                                 );
                                             })}
                                         </tbody>
                                     </table>
                                 )}
                                 
                                 <div className="p-2 text-center border-t border-[#E9E9E7] bg-gray-50 cursor-pointer hover:bg-gray-100 text-xs text-[#787774] font-medium" onClick={() => onSelectSession(session)}>
                                     Open Full Session Details <ChevronRight size={12} className="inline ml-1" />
                                 </div>
                             </div>
                         )}
                     </div>
                 );
             })}
         </div>
       )}
    </div>
  );
};

export default History;
