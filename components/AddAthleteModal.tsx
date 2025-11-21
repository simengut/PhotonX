
import React, { useState } from 'react';
import { Athlete } from '../types';
import { X, UserPlus } from 'lucide-react';

interface AddAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (athlete: Athlete) => Promise<void>;
}

const AddAthleteModal: React.FC<AddAthleteModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [primaryEvent, setPrimaryEvent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);

    const newAthlete: Athlete = {
      id: Date.now().toString(),
      name,
      email: email || undefined,
      gender,
      dob: dob || undefined,
      primaryEvent: primaryEvent || undefined
    };

    await onSave(newAthlete);
    
    // Reset and close
    setName('');
    setEmail('');
    setDob('');
    setPrimaryEvent('');
    setGender('Male');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-[#E9E9E7]">
        
        <div className="p-6 border-b border-[#E9E9E7] flex justify-between items-center bg-[#F7F7F5]">
           <div>
             <h2 className="text-xl font-serif font-bold text-[#37352F]">New Athlete</h2>
             <p className="text-xs text-[#787774]">Add a new profile to your database.</p>
           </div>
           <button onClick={onClose} className="p-1 hover:bg-[#E9E9E7] rounded text-[#787774] hover:text-[#37352F] transition-colors">
             <X size={20} />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Full Name *</label>
                <input 
                    autoFocus
                    required
                    placeholder="e.g. Usain Bolt"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F] transition-colors"
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Gender</label>
                    <select 
                        value={gender} 
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Date of Birth</label>
                    <input 
                        type="date"
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                        className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                     <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Primary Event</label>
                     <input 
                        placeholder="e.g. 100m"
                        value={primaryEvent}
                        onChange={e => setPrimaryEvent(e.target.value)}
                        className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">Email (Optional)</label>
                    <input 
                        type="email"
                        placeholder="athlete@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <button 
                    type="button"
                    onClick={onClose} 
                    className="px-4 py-2 rounded text-[#787774] text-sm font-medium hover:bg-[#F7F7F5] transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    disabled={isSubmitting || !name}
                    className="bg-[#37352F] text-white px-6 py-2 rounded text-sm font-medium hover:bg-[#2F2F2F] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    <UserPlus size={16} />
                    {isSubmitting ? 'Saving...' : 'Add Athlete'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AddAthleteModal;
