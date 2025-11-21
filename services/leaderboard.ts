import { LeaderboardEntry } from '../types';
import { db, auth } from './firebase';

// Helper to remove undefined values
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

export const leaderboardService = {
  /**
   * Post a run result to the public leaderboard
   */
  async postToLeaderboard(entry: LeaderboardEntry) {
    if (!auth.currentUser) throw new Error("User not authenticated");

    const cleanedEntry = cleanData(entry);
    await db.collection('leaderboards').doc(entry.id).set(cleanedEntry);
  },

  /**
   * Subscribe to leaderboard entries for a specific test type
   * Returns unsubscribe function
   */
  subscribeToLeaderboard(
    testType: string,
    callback: (entries: LeaderboardEntry[]) => void
  ) {
    return db.collection('leaderboards')
      .where('testType', '==', testType)
      .orderBy('time', 'asc') // Fastest times first
      .limit(100)
      .onSnapshot(snapshot => {
        const entries = snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
        callback(entries);
      });
  },

  /**
   * Delete a leaderboard entry (user can only delete their own)
   */
  async deleteEntry(entryId: string) {
    if (!auth.currentUser) throw new Error("User not authenticated");

    try {
      await db.collection('leaderboards').doc(entryId).delete();
    } catch (error: any) {
      console.error("Error deleting leaderboard entry:", error);
      if (error.code === 'permission-denied') {
        throw new Error("Permission Denied: You can only delete your own entries.");
      }
      throw error;
    }
  },

  /**
   * Get all leaderboard entries posted by a specific user
   */
  async getUserEntries(userId: string): Promise<LeaderboardEntry[]> {
    const snapshot = await db.collection('leaderboards')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
  },

  /**
   * Get all leaderboard entries for a specific athlete
   */
  async getAthleteEntries(athleteId: string): Promise<LeaderboardEntry[]> {
    const snapshot = await db.collection('leaderboards')
      .where('athleteId', '==', athleteId)
      .orderBy('time', 'asc')
      .get();

    return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
  },

  /**
   * Update athlete name in all leaderboard entries
   * Called when an athlete's name is changed
   */
  async updateAthleteName(athleteId: string, newName: string, newGender?: 'Male' | 'Female' | 'Other') {
    if (!auth.currentUser) throw new Error("User not authenticated");

    try {
      // Get all leaderboard entries for this athlete
      const snapshot = await db.collection('leaderboards')
        .where('athleteId', '==', athleteId)
        .get();

      // Update each entry
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        const updateData: any = { athleteName: newName };
        if (newGender !== undefined) {
          updateData.athleteGender = newGender;
        }
        batch.update(doc.ref, updateData);
      });

      await batch.commit();
      console.log(`Updated ${snapshot.docs.length} leaderboard entries for athlete ${athleteId}`);
    } catch (error) {
      console.error("Error updating athlete name in leaderboard:", error);
      throw error;
    }
  }
};
