
import React, { useState, useEffect } from 'react';
import { AppSettings, SpeedUnit, DistanceUnit, DateFormat } from '../types';
import { User, Globe, Calendar, Shield, LogOut, Save, AlertCircle } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onLogout: () => void;
  userEmail: string;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, onLogout, userEmail }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with props if they change externally (e.g. initial load)
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const update = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    // Simple equality check to toggle "dirty" state
    const isDifferent = JSON.stringify(newSettings) !== JSON.stringify(settings);
    setHasChanges(isDifferent);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    // hasChanges will be reset by the useEffect when props update from parent
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 relative">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2">Settings</h1>
        <p className="text-[#787774]">Manage your preferences and account.</p>
      </div>

      {/* Unit Preferences */}
      <section className="mb-8">
        <h3 className="text-xs font-bold text-[#9B9A97] uppercase mb-4 tracking-wider flex items-center gap-2">
            <Globe size={14}/> Region & Units
        </h3>
        <div className="bg-white border border-[#E9E9E7] rounded-lg divide-y divide-[#E9E9E7] overflow-hidden shadow-sm">
            
            {/* Speed Unit */}
            <div className="p-4 flex items-center justify-between hover:bg-[#F7F7F5] transition-colors">
                <div>
                    <div className="font-medium text-[#37352F]">Speed Unit</div>
                    <div className="text-xs text-[#9B9A97]">Unit for velocity charts and live display.</div>
                </div>
                <div className="flex bg-[#F7F7F5] rounded p-1 border border-[#E9E9E7]">
                    {(['mps', 'kph', 'mph'] as SpeedUnit[]).map((unit) => (
                        <button
                            key={unit}
                            onClick={() => update('speedUnit', unit)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                localSettings.speedUnit === unit 
                                ? 'bg-white text-[#37352F] shadow-sm' 
                                : 'text-[#9B9A97] hover:text-[#787774]'
                            }`}
                        >
                            {unit === 'mps' ? 'm/s' : unit === 'kph' ? 'km/h' : 'mph'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Distance Unit */}
            <div className="p-4 flex items-center justify-between hover:bg-[#F7F7F5] transition-colors">
                <div>
                    <div className="font-medium text-[#37352F]">Distance Unit</div>
                    <div className="text-xs text-[#9B9A97]">Metric (Meters) or Imperial (Yards).</div>
                </div>
                <div className="flex bg-[#F7F7F5] rounded p-1 border border-[#E9E9E7]">
                    {(['metric', 'imperial'] as DistanceUnit[]).map((unit) => (
                        <button
                            key={unit}
                            onClick={() => update('distanceUnit', unit)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                localSettings.distanceUnit === unit 
                                ? 'bg-white text-[#37352F] shadow-sm' 
                                : 'text-[#9B9A97] hover:text-[#787774]'
                            }`}
                        >
                            {unit === 'metric' ? 'Meters' : 'Yards'}
                        </button>
                    ))}
                </div>
            </div>

             {/* Date Format */}
             <div className="p-4 flex items-center justify-between hover:bg-[#F7F7F5] transition-colors">
                <div>
                    <div className="font-medium text-[#37352F]">Date Format</div>
                    <div className="text-xs text-[#9B9A97]">Display format for history logs.</div>
                </div>
                <select 
                    value={localSettings.dateFormat}
                    onChange={(e) => update('dateFormat', e.target.value)}
                    className="bg-[#F7F7F5] border border-[#E9E9E7] text-[#37352F] text-xs rounded px-2 py-1 outline-none focus:border-[#37352F]"
                >
                    <option value="MM.DD.YYYY">MM.DD.YYYY</option>
                    <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
            </div>
        </div>
      </section>

      {/* Account */}
      <section className="mb-8">
        <h3 className="text-xs font-bold text-[#9B9A97] uppercase mb-4 tracking-wider flex items-center gap-2">
            <User size={14}/> Account
        </h3>
        <div className="bg-white border border-[#E9E9E7] rounded-lg divide-y divide-[#E9E9E7] overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F7F7F5] rounded-full flex items-center justify-center text-[#37352F] border border-[#E9E9E7]">
                        <User size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-[#37352F]">Current User</div>
                        <div className="text-xs text-[#9B9A97]">{userEmail}</div>
                    </div>
                </div>
                <button className="text-xs bg-white border border-[#E9E9E7] px-3 py-1.5 rounded text-[#37352F] hover:bg-[#F7F7F5]">
                    Edit Profile
                </button>
            </div>
             <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#37352F]">
                    <Shield size={16} className="text-[#9B9A97]" />
                    <span className="text-sm">Password & Security</span>
                </div>
                <button className="text-xs text-[#9B9A97] hover:text-[#37352F] hover:underline">
                    Change
                </button>
            </div>
        </div>
      </section>

      <div className="flex justify-center mt-12">
        <button 
            onClick={onLogout} 
            className="text-red-600 text-sm font-medium flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded transition-colors"
        >
            <LogOut size={16} /> Log Out
        </button>
      </div>

      {/* Save / Cancel Banner */}
      {hasChanges && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#37352F] text-white p-4 rounded-lg shadow-xl flex items-center gap-6 animate-in slide-in-from-bottom-4 z-50 w-[90%] max-w-md justify-between border border-[#787774]">
             <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-yellow-400"/>
                <span className="text-sm font-medium">Unsaved changes</span>
             </div>
             <div className="flex items-center gap-3">
                 <button 
                    onClick={handleCancel} 
                    className="px-3 py-1.5 hover:bg-white/10 rounded text-xs font-medium transition-colors text-gray-300 hover:text-white"
                 >
                    Discard
                 </button>
                 <button 
                    onClick={handleSave} 
                    className="px-4 py-1.5 bg-white text-[#37352F] rounded text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1 shadow-sm"
                 >
                    <Save size={14}/> Save Changes
                 </button>
             </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
