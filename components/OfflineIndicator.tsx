import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';

const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing } = useOffline();

  if (isOnline && !isSyncing) {
    return null; // Don't show anything when everything is normal
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-2">
      {isSyncing ? (
        <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
          <RefreshCw size={16} className="animate-spin" />
          <span>Syncing data...</span>
        </div>
      ) : !isOnline ? (
        <div className="bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
          <WifiOff size={16} />
          <span>Offline Mode - Data will sync when connection returns</span>
        </div>
      ) : null}
    </div>
  );
};

export default OfflineIndicator;
