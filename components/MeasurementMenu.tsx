
import React from 'react';
import { TestType, TEST_TYPES } from '../constants';
import { Play, Timer, Zap, Activity, ArrowUpRight, Ruler, Target } from 'lucide-react';

// Custom American Football Icon
const Football: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="12" rx="9" ry="5.5" />
    <line x1="12" y1="6.5" x2="12" y2="17.5" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="10" y1="10" x2="14" y2="10" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);

interface MeasurementMenuProps {
  onSelectType: (type: TestType) => void;
}

const MeasurementMenu: React.FC<MeasurementMenuProps> = ({ onSelectType }) => {
  
  const items = [
    { type: TestType.FREE_RUN, icon: Activity, color: 'text-gray-600' },
    { type: TestType.ACCELERATION, icon: Timer, color: 'text-blue-600' },
    { type: TestType.FLY, icon: Zap, color: 'text-yellow-600' },
    { type: TestType.FORTY_YARD_DASH, icon: Football, color: 'text-orange-600' },
    { type: TestType.SIXTY_METER_RUN, icon: Target, color: 'text-red-600' },
    { type: TestType.POLE_VAULT, icon: ArrowUpRight, color: 'text-purple-600' },
    { type: TestType.LONG_JUMP, icon: Ruler, color: 'text-green-600' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-0">
      <div className="mb-8 border-b border-[#E9E9E7] pb-6">
        <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2">Measurement Mode</h1>
        <p className="text-[#787774]">Select a test protocol to begin a new training session.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(({ type, icon: Icon, color }) => (
          <div 
            key={type}
            className="bg-white border border-[#E9E9E7] rounded-xl p-6 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            onClick={() => onSelectType(type)}
          >
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>
                <Icon size={100} />
            </div>
            
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-lg bg-[#F7F7F5] flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-[#37352F] mb-1">{TEST_TYPES[type].label}</h3>
                <p className="text-sm text-[#9B9A97] mb-6 min-h-[40px]">{TEST_TYPES[type].description}</p>
                
                <button className="flex items-center gap-2 text-sm font-medium bg-[#37352F] text-white px-4 py-2 rounded-lg group-hover:bg-black transition-colors w-full justify-center">
                    <Play size={14} fill="currentColor"/> Start Session
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeasurementMenu;
