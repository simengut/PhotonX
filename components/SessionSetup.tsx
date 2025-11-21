
import React, { useState } from 'react';
import { Athlete, TestType } from '../types';
import { Users, Check, Plus, X, Target } from 'lucide-react';
import { TEST_TYPES } from '../constants';

interface SessionSetupProps {
  allAthletes: Athlete[];
  onStartSession: (name: string, selectedIds: string[]) => void;
  onAddAthlete: (athlete: Athlete) => void;
  onCancel: () => void;
  testType?: TestType;
}

const SessionSetup: React.FC<SessionSetupProps> = ({ allAthletes, onStartSession, onAddAthlete, onCancel, testType }) => {
  const [sessionName, setSessionName] = useState(`Session - ${new Date().toLocaleDateString()}`);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  
  // New Athlete Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGender, setNewGender] = useState<'Male' | 'Female'>('Male');
  const [newDob, setNewDob] = useState('');
  const [newEvent, setNewEvent] = useState('');

  const toggleAthlete = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleAddNew = (e: React.FormEvent) => {
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
    onAddAthlete(newAthlete);
    setSelectedIds(prev => [...prev, newAthlete.id]); // Auto select
    // Reset
    setNewName('');
    setNewEmail('');
    setNewDob('');
    setNewEvent('');
    setShowAddAthlete(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2">New Training Session</h1>
            <p className="text-[#787774]">Select athletes and configure your session.</p>
            {testType && (
                <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <Target size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Test Type: {TEST_TYPES[testType].label}</span>
                </div>
            )}
        </div>

        <div className="bg-white border border-[#E9E9E7] rounded-lg p-6 shadow-sm mb-6">
            <div className="mb-6">
                <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-2">Session Name</label>
                <input 
                    type="text" 
                    value={sessionName} 
                    onChange={e => setSessionName(e.target.value)}
                    className="w-full text-lg font-medium text-[#37352F] border-b border-[#E9E9E7] pb-2 focus:border-[#37352F] outline-none transition-colors bg-transparent"
                />
            </div>

            <div className="mb-4 flex items-center justify-between">
                 <label className="block text-xs font-bold text-[#9B9A97] uppercase">Select Athletes ({selectedIds.length})</label>
                 <button onClick={() => setShowAddAthlete(true)} className="text-xs flex items-center gap-1 text-[#37352F] font-medium hover:bg-[#F7F7F5] px-2 py-1 rounded">
                    <Plus size={12} /> Add New
                 </button>
            </div>

            {/* Add Athlete Modal/Inline */}
            {showAddAthlete && (
                <div className="mb-6 bg-[#F7F7F5] p-4 rounded border border-[#E9E9E7]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-[#37352F]">New Athlete Profile</span>
                        <button onClick={() => setShowAddAthlete(false)}><X size={14}/></button>
                    </div>
                    <form onSubmit={handleAddNew} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Full Name *</label>
                            <input 
                                autoFocus
                                placeholder="e.g. John Doe"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Email</label>
                            <input 
                                placeholder="john@example.com"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                            />
                        </div>

                        <div>
                             <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Primary Event</label>
                             <input 
                                placeholder="e.g. 100m"
                                value={newEvent}
                                onChange={e => setNewEvent(e.target.value)}
                                className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Gender</label>
                            <select 
                                value={newGender} 
                                onChange={(e) => setNewGender(e.target.value as 'Male' | 'Female')}
                                className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Date of Birth</label>
                            <input 
                                type="date"
                                value={newDob}
                                onChange={e => setNewDob(e.target.value)}
                                className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                            />
                        </div>

                        <div className="col-span-2 flex justify-end mt-2">
                             <button type="submit" className="bg-[#37352F] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#2F2F2F] transition-colors">Add Athlete</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {allAthletes.map(athlete => {
                    const isSelected = selectedIds.includes(athlete.id);
                    return (
                        <div 
                            key={athlete.id} 
                            onClick={() => toggleAthlete(athlete.id)}
                            className={`flex items-center p-3 rounded cursor-pointer border transition-all ${isSelected ? 'bg-[#F7F7F5] border-[#37352F] shadow-sm' : 'bg-white border-[#E9E9E7] hover:bg-gray-50'}`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${isSelected ? 'bg-[#37352F] border-[#37352F]' : 'border-[#9B9A97]'}`}>
                                {isSelected && <Check size={10} className="text-white" />}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-[#37352F]">{athlete.name}</div>
                                <div className="text-xs text-[#9B9A97]">
                                    {athlete.primaryEvent ? athlete.primaryEvent : 'Athlete'} 
                                    {athlete.gender ? ` • ${athlete.gender.charAt(0)}` : ''}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="flex justify-end gap-3">
            <button onClick={onCancel} className="px-6 py-2 rounded text-[#787774] font-medium hover:bg-[#F7F7F5] transition-colors">
                Cancel
            </button>
            <button 
                onClick={() => onStartSession(sessionName, selectedIds)}
                disabled={selectedIds.length === 0}
                className="bg-[#37352F] text-white px-8 py-2 rounded font-medium hover:bg-[#2F2F2F] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
                Start Session <Users size={16} />
            </button>
        </div>
    </div>
  );
};

export default SessionSetup;
