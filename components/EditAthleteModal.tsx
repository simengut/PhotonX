
import React, { useState, useEffect } from 'react';
import { Athlete } from '../types';
import { X, Save } from 'lucide-react';

interface EditAthleteModalProps {
  isOpen: boolean;
  athlete: Athlete | null;
  onClose: () => void;
  onSave: (athlete: Athlete) => Promise<void>;
}

const EditAthleteModal: React.FC<EditAthleteModalProps> = ({ isOpen, athlete, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [primaryEvent, setPrimaryEvent] = useState('');
  const [pb100m, setPb100m] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (athlete) {
      setName(athlete.name);
      setEmail(athlete.email || '');
      setGender(athlete.gender || 'Male');
      setDob(athlete.dob || '');
      setPrimaryEvent(athlete.primaryEvent || '');
      setPb100m(athlete.pb100m?.toString() || '');
    }
  }, [athlete]);

  if (!isOpen || !athlete) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);

    const updatedAthlete: Athlete = {
      ...athlete,
      name,
      email: email || undefined,
      gender,
      dob: dob || undefined,
      primaryEvent: primaryEvent || undefined,
      pb100m: pb100m ? parseFloat(pb100m) : undefined
    };

    await onSave(updatedAthlete);

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-[#E9E9E7]">

        <div className="p-6 border-b border-[#E9E9E7] flex justify-between items-center bg-[#F7F7F5]">
           <div>
             <h2 className="text-xl font-serif font-bold text-[#37352F]">Edit Athlete</h2>
             <p className="text-xs text-[#787774]">Update athlete information.</p>
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
                    <label className="block text-[10px] font-bold text-[#9B9A97] uppercase mb-1">100m PB (seconds)</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 10.55"
                        value={pb100m}
                        onChange={e => setPb100m(e.target.value)}
                        className="w-full bg-white text-[#37352F] border border-[#E9E9E7] rounded px-3 py-2 text-sm outline-none focus:border-[#37352F]"
                    />
                </div>
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
                    <Save size={16} />
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default EditAthleteModal;
