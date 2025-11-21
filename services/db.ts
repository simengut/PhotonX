
import { Athlete, TrainingSession, RunSession, AppSettings } from "../types";
import { DEFAULT_SETTINGS } from "../constants";
import { db, auth } from './firebase';
import { leaderboardService } from './leaderboard';

// Helper to remove undefined values which Firestore hates
const cleanData = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => cleanData(item));
    } else if (data !== null && typeof data === 'object') {
        const cleaned: any = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== undefined) {
                cleaned[key] = cleanData(value);
            }
        });
        return cleaned;
    }
    return data;
};

// Helper to get user doc ref
const getUserRef = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated");
    return db.collection('users').doc(userId);
};

export const dbService = {
  
  async saveSettings(settings: AppSettings) {
    if (!auth.currentUser) return;
    await getUserRef().set({ settings: cleanData(settings) }, { merge: true });
  },

  async getSettings(): Promise<AppSettings> {
    if (!auth.currentUser) return DEFAULT_SETTINGS;
    const doc = await getUserRef().get();
    return (doc.data()?.settings as AppSettings) || DEFAULT_SETTINGS;
  },

  async addAthlete(athlete: Athlete) {
    if (!auth.currentUser) return;
    await getUserRef().collection('athletes').doc(athlete.id).set(cleanData(athlete));
  },

  async updateAthlete(athlete: Athlete) {
    if (!auth.currentUser) return;

    // Get the old athlete data to check if name or gender changed
    const oldDoc = await getUserRef().collection('athletes').doc(athlete.id).get();
    const oldAthlete = oldDoc.data() as Athlete | undefined;

    // Update the athlete in database
    await getUserRef().collection('athletes').doc(athlete.id).set(cleanData(athlete), { merge: true });

    // If name or gender changed, update leaderboard entries
    if (oldAthlete && (oldAthlete.name !== athlete.name || oldAthlete.gender !== athlete.gender)) {
      try {
        await leaderboardService.updateAthleteName(athlete.id, athlete.name, athlete.gender);
      } catch (error) {
        console.error("Failed to update leaderboard entries:", error);
        // Don't throw - athlete is already updated, leaderboard will be inconsistent but not critical
      }
    }
  },

  async deleteAthlete(athleteId: string) {
    if (!auth.currentUser) return;
    await getUserRef().collection('athletes').doc(athleteId).delete();
  },

  subscribeToAthletes(callback: (athletes: Athlete[]) => void) {
    if (!auth.currentUser) return () => {};
    
    return getUserRef().collection('athletes').onSnapshot(snapshot => {
        const athletes = snapshot.docs.map(doc => doc.data() as Athlete);
        callback(athletes);
    });
  },

  async createSession(session: TrainingSession) {
    if (!auth.currentUser) return;
    await getUserRef().collection('sessions').doc(session.id).set(cleanData(session));
  },

  async updateSession(sessionId: string, data: Partial<TrainingSession>) {
    if (!auth.currentUser) return;
    await getUserRef().collection('sessions').doc(sessionId).update(cleanData(data));
  },

  async updateSessionAthletes(sessionId: string, athleteIds: string[]) {
    if (!auth.currentUser) return;
    await getUserRef().collection('sessions').doc(sessionId).update({ athleteIds });
  },

  async finishSession(sessionId: string) {
    if (!auth.currentUser) return;
    await getUserRef().collection('sessions').doc(sessionId).update({ status: 'COMPLETED' });
  },

  async deleteSession(sessionId: string) {
    if (!auth.currentUser) {
        console.error("Cannot delete session: User not authenticated");
        throw new Error("User not authenticated");
    }
    try {
        console.log("Attempting to delete session:", sessionId);
        await getUserRef().collection('sessions').doc(sessionId).delete();
        console.log("Session deleted successfully from DB");
    } catch (error: any) {
        console.error("Error deleting session from DB:", error);
        if (error.code === 'permission-denied') {
             throw new Error("Permission Denied: Check your Firestore Console Rules to allow delete.");
        }
        throw error;
    }
  },

  async addRunToSession(sessionId: string, run: RunSession) {
    if (!auth.currentUser) return;
    const ref = getUserRef().collection('sessions').doc(sessionId);
    const doc = await ref.get();
    if (doc.exists) {
        const session = doc.data() as TrainingSession;
        const updatedRuns = [...(session.runs || []), cleanData(run)];
        await ref.update({ runs: updatedRuns });
    }
  },

  async updateRunInSession(sessionId: string, updatedRuns: RunSession[]) {
    if (!auth.currentUser) return;
    await getUserRef().collection('sessions').doc(sessionId).update({ runs: cleanData(updatedRuns) });
  },

  subscribeToSessions(callback: (sessions: TrainingSession[]) => void) {
     if (!auth.currentUser) return () => {};
     return getUserRef().collection('sessions').orderBy('date', 'desc').onSnapshot(snapshot => {
         const sessions = snapshot.docs.map(doc => doc.data() as TrainingSession);
         callback(sessions);
     });
  }
};
