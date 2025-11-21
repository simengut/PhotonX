
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Athlete, TrainingSession, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import { dbService } from '../services/db';
import { useAuth } from './AuthContext';

interface DataContextType {
  athletes: Athlete[];
  sessions: TrainingSession[];
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
  athletes: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
  refreshSettings: async () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const refreshSettings = async () => {
    if (user) {
      const s = await dbService.getSettings();
      setSettings(s);
    }
  };

  useEffect(() => {
    if (!user) {
      setAthletes([]);
      setSessions([]);
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    refreshSettings();

    const unsubAthletes = dbService.subscribeToAthletes(setAthletes);
    const unsubSessions = dbService.subscribeToSessions(setSessions);

    return () => {
      unsubAthletes();
      unsubSessions();
    };
  }, [user]);

  return (
    <DataContext.Provider value={{ athletes, sessions, settings, refreshSettings }}>
      {children}
    </DataContext.Provider>
  );
};
