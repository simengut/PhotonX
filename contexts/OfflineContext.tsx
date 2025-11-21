import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingWrites: number;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isSyncing: false,
  pendingWrites: 0
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(0);

  useEffect(() => {
    // Monitor browser online/offline status
    const handleOnline = () => {
      console.log('🟢 Connection restored - syncing data...');
      setIsOnline(true);
      setIsSyncing(true);
    };

    const handleOffline = () => {
      console.log('🔴 Connection lost - working offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor Firestore sync status
    // Firestore doesn't directly expose pending writes count, but we can monitor snapshot metadata
    let snapshotListeners: Array<() => void> = [];

    // Listen to a dummy collection to detect sync status
    const unsubscribe = db.collection('_sync_status').limit(1).onSnapshot(
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.fromCache) {
          // Data is from cache (offline or pending sync)
          if (!navigator.onLine) {
            setIsSyncing(false);
          }
        } else {
          // Data is from server (synced)
          setIsSyncing(false);
        }
      }
    );

    // Simulate pending writes detection
    // In a real app, you'd track writes in your db service
    const checkSyncStatus = setInterval(() => {
      if (isOnline && !navigator.onLine) {
        setIsOnline(false);
      } else if (!isOnline && navigator.onLine) {
        setIsOnline(true);
        setIsSyncing(true);
        // Assume sync completes after a delay
        setTimeout(() => setIsSyncing(false), 2000);
      }
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(checkSyncStatus);
      snapshotListeners.forEach(unsub => unsub());
    };
  }, [isOnline]);

  return (
    <OfflineContext.Provider value={{ isOnline, isSyncing, pendingWrites }}>
      {children}
    </OfflineContext.Provider>
  );
};
