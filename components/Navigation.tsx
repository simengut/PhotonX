
import React, { useState } from 'react';
import { ViewState } from '../types';
import { Activity, BarChart2, Users, LogOut, Zap, History, Settings, MessageSquare, TrendingUp, Trophy, Book } from 'lucide-react';

interface NavigationProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onChangeView, onLogout }) => {
  const [logoError, setLogoError] = useState(false);

  const NavItem = ({ view, icon: Icon, label, mobileOnly = false }: { view: ViewState, icon: any, label: string, mobileOnly?: boolean }) => {
    const isActive = currentView === view;
    // Mobile Style
    const mobileClasses = `flex flex-col items-center justify-center p-2 w-full transition-colors ${
      isActive ? 'text-[#37352F]' : 'text-[#9B9A97]'
    }`;

    // Desktop Style
    const desktopClasses = `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors select-none ${
      isActive ? 'bg-[#EFEFED] text-[#37352F]' : 'text-[#787774] hover:bg-[#EFEFED] hover:text-[#37352F]'
    }`;

    // Return specific rendering based on parent context, handled via CSS media queries structure below
    return (
      <>
        {/* Mobile */}
        <button
          onClick={() => onChangeView(view)}
          className={`md:hidden ${mobileClasses} ${mobileOnly ? '' : ''}`}
        >
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-medium">{label}</span>
        </button>

        {/* Desktop */}
        <button
          onClick={() => onChangeView(view)}
          className={`hidden md:flex ${desktopClasses}`}
        >
          <Icon size={16} strokeWidth={2} /> {label}
        </button>
      </>
    );
  };

  const ExternalLink = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
    const desktopClasses = "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors select-none text-[#787774] hover:bg-[#EFEFED] hover:text-[#37352F]";

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`hidden md:flex ${desktopClasses}`}
      >
        <Icon size={16} strokeWidth={2} /> {label}
      </a>
    );
  };

  return (
    <>
      {/* Mobile/Tablet Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E9E9E7] flex justify-between items-center z-50 pb-safe px-2 shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
        <NavItem view={ViewState.DASHBOARD} icon={Activity} label="Home" />
        <NavItem view={ViewState.LIVE_RUN} icon={Zap} label="Measure" />
        <NavItem view={ViewState.LEADERBOARD} icon={Trophy} label="Ranks" />
        <NavItem view={ViewState.HISTORY} icon={History} label="History" />
        <NavItem view={ViewState.SETTINGS} icon={Settings} label="Settings" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-60 bg-[#F7F7F5] border-r border-[#E9E9E7] h-screen fixed left-0 top-0">
        <div className="px-6 pt-6 pb-2 flex flex-col items-center">
           {!logoError ? (
              <img
                src="favicon.png?v=8"
                alt="Logo"
                className="w-32 h-auto"
                onError={() => setLogoError(true)}
              />
           ) : (
              <div className="w-20 h-20 rounded-xl shadow-sm bg-[#37352F] flex items-center justify-center">
                <Activity size={44} className="text-white" />
              </div>
           )}
        </div>
        
        <nav className="flex-1 flex flex-col gap-0.5 px-2">
          <div className="px-3 py-2 text-xs font-bold text-[#9B9A97] uppercase tracking-wider">Workspace</div>
          <NavItem view={ViewState.DASHBOARD} icon={Activity} label="Dashboard" />
          <NavItem view={ViewState.LIVE_RUN} icon={Zap} label="Measurement" />
          <NavItem view={ViewState.HISTORY} icon={History} label="History" />
          <NavItem view={ViewState.ATHLETES} icon={Users} label="Athletes" />
          <NavItem view={ViewState.ANALYTICS} icon={BarChart2} label="Analytics" />

          <div className="mt-6 px-3 py-2 text-xs font-bold text-[#9B9A97] uppercase tracking-wider">Social</div>
          <NavItem view={ViewState.LEADERBOARD} icon={Trophy} label="Leaderboard" />

          <div className="mt-6 px-3 py-2 text-xs font-bold text-[#9B9A97] uppercase tracking-wider">Tools</div>
          <NavItem view={ViewState.SENSOR_CHECK} icon={Activity} label="Sensor Check" />
          <NavItem view={ViewState.GUIDE} icon={Book} label="User Guide" />
          <NavItem view={ViewState.SETTINGS} icon={Settings} label="Settings" />

          <div className="mt-6 px-3 py-2 text-xs font-bold text-[#9B9A97] uppercase tracking-wider">Community</div>
          <ExternalLink href="https://laservelocitypro.userjot.com/" icon={MessageSquare} label="Feedback" />
          <ExternalLink href="https://laservelocitypro.userjot.com/roadmap" icon={TrendingUp} label="Roadmap" />
        </nav>
        
        <div className="p-2 border-t border-[#E9E9E7]">
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 w-full rounded-md font-medium text-[#787774] hover:bg-[#EFEFED] text-sm transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Navigation;
