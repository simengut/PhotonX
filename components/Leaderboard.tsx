import React, { useState, useEffect, useMemo } from 'react';
import { LeaderboardEntry, TestType } from '../types';
import { leaderboardService } from '../services/leaderboard';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Trash2, Medal, Award, Play, MoreVertical, Check, X } from 'lucide-react';

interface LeaderboardProps {
  onStartTest?: (testType: TestType) => void;
}

interface UserEntryWithRank extends LeaderboardEntry {
  rank: number;
  totalEntries: number;
}

type LeaderboardView = 'one-per-athlete' | 'unlimited';

const Leaderboard: React.FC<LeaderboardProps> = ({ onStartTest }) => {
  const [fortyYardEntries, setFortyYardEntries] = useState<LeaderboardEntry[]>([]);
  const [accel30mEntries, setAccel30mEntries] = useState<LeaderboardEntry[]>([]);
  const [fly30mEntries, setFly30mEntries] = useState<LeaderboardEntry[]>([]);
  const [sixtyMeterEntries, setSixtyMeterEntries] = useState<LeaderboardEntry[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();

  // Delete mode state
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Track active view for each test type
  const [activeViews, setActiveViews] = useState<Record<string, LeaderboardView>>({
    'FORTY_YARD_DASH': 'one-per-athlete',
    'ACCELERATION_30M': 'one-per-athlete',
    'FLY_30M': 'one-per-athlete',
    'SIXTY_METER_RUN': 'one-per-athlete'
  });

  useEffect(() => {
    const unsubscribe40yd = leaderboardService.subscribeToLeaderboard('FORTY_YARD_DASH', setFortyYardEntries);
    const unsubscribeAccel = leaderboardService.subscribeToLeaderboard('ACCELERATION_30M', setAccel30mEntries);
    const unsubscribeFly = leaderboardService.subscribeToLeaderboard('FLY_30M', setFly30mEntries);
    const unsubscribe60m = leaderboardService.subscribeToLeaderboard('SIXTY_METER_RUN', setSixtyMeterEntries);

    return () => {
      unsubscribe40yd();
      unsubscribeAccel();
      unsubscribeFly();
      unsubscribe60m();
    };
  }, []);

  // Get all user entries from loaded leaderboard data
  const userEntries = useMemo(() => {
    if (!user) return [];

    const allEntries = [
      ...fortyYardEntries,
      ...accel30mEntries,
      ...fly30mEntries,
      ...sixtyMeterEntries
    ];

    return allEntries.filter(entry => entry.userId === user.uid);
  }, [user, fortyYardEntries, accel30mEntries, fly30mEntries, sixtyMeterEntries]);

  // Calculate user entries with ranks
  const userEntriesWithRanks: UserEntryWithRank[] = useMemo(() => {
    return userEntries.map(entry => {
      let allEntries: LeaderboardEntry[] = [];

      switch (entry.testType) {
        case 'FORTY_YARD_DASH':
          allEntries = fortyYardEntries;
          break;
        case 'ACCELERATION_30M':
          allEntries = accel30mEntries;
          break;
        case 'FLY_30M':
          allEntries = fly30mEntries;
          break;
        case 'SIXTY_METER_RUN':
          allEntries = sixtyMeterEntries;
          break;
      }

      // Find rank (position in sorted list)
      const rank = allEntries.findIndex(e => e.id === entry.id) + 1;

      return {
        ...entry,
        rank,
        totalEntries: allEntries.length
      };
    });
  }, [userEntries, fortyYardEntries, accel30mEntries, fly30mEntries, sixtyMeterEntries]);

  const toggleEntrySelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleBulkDelete = async () => {
    if (isDeleting || selectedEntries.size === 0) return;

    const count = selectedEntries.size;
    if (!confirm(`Are you sure you want to remove ${count} ${count === 1 ? 'entry' : 'entries'} from the leaderboard?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all selected entries
      await Promise.all(
        Array.from(selectedEntries).map(id => leaderboardService.deleteEntry(id))
      );

      // Reset state
      setSelectedEntries(new Set());
      setDeleteMode(false);
    } catch (error: any) {
      alert('Failed to delete entries: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedEntries(new Set());
  };

  // Filter entries to show only best time per athlete
  const getUniqueAthletes = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    const bestByAthlete = new Map<string, LeaderboardEntry>();

    entries.forEach(entry => {
      const existing = bestByAthlete.get(entry.athleteId);
      if (!existing || entry.time < existing.time) {
        bestByAthlete.set(entry.athleteId, entry);
      }
    });

    // Return sorted by time (already sorted from subscription)
    return Array.from(bestByAthlete.values()).sort((a, b) => a.time - b.time);
  };

  const setActiveView = (testType: string, view: LeaderboardView) => {
    setActiveViews(prev => ({ ...prev, [testType]: view }));
  };

  const getTestLabel = (type: string): string => {
    switch (type) {
      case 'FORTY_YARD_DASH': return '40 Yard Dash';
      case 'ACCELERATION_30M': return '30m Acceleration';
      case 'FLY_30M': return '30m Flying';
      case 'SIXTY_METER_RUN': return '60m Run';
      default: return type;
    }
  };

  const getGenderBadge = (gender?: string) => {
    if (!gender) return null;
    const colors = {
      'Male': 'bg-blue-100 text-blue-700',
      'Female': 'bg-pink-100 text-pink-700',
      'Other': 'bg-purple-100 text-purple-700'
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[gender as keyof typeof colors] || 'bg-gray-100 text-gray-700'}`}>
        {gender.charAt(0)}
      </span>
    );
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return <Medal className="text-yellow-500" size={16} />;
    if (rank === 2) return <Medal className="text-gray-400" size={16} />;
    if (rank === 3) return <Medal className="text-orange-600" size={16} />;
    return <span className="text-[#9B9A97] font-bold text-xs">#{rank}</span>;
  };

  const testTypes = [
    { value: 'FORTY_YARD_DASH', label: '40 Yard Dash', testType: 'FORTY_YARD_DASH' as TestType, entries: fortyYardEntries },
    { value: 'ACCELERATION_30M', label: '30m Accel', testType: 'ACCELERATION' as TestType, entries: accel30mEntries },
    { value: 'FLY_30M', label: '30m Fly', testType: 'FLY' as TestType, entries: fly30mEntries },
    { value: 'SIXTY_METER_RUN', label: '60m Run', testType: 'SIXTY_METER_RUN' as TestType, entries: sixtyMeterEntries }
  ];

  const renderLeaderboardCard = (testLabel: string, testType: TestType, entries: LeaderboardEntry[], testTypeKey: string) => {
    const activeView = activeViews[testTypeKey];

    // Filter entries based on active view
    const filteredEntries = activeView === 'one-per-athlete' ? getUniqueAthletes(entries) : entries;
    const topEntries = filteredEntries.slice(0, 20); // Show top 20 per card

    return (
      <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden shadow-sm">
        {/* Card Header */}
        <div className="bg-[#F7F7F5] border-b border-[#E9E9E7] px-3 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-[#37352F] text-base">{testLabel}</h3>
            {/* Small toggle */}
            <div className="flex border border-[#E9E9E7] rounded overflow-hidden bg-white">
              <button
                onClick={() => setActiveView(testTypeKey, 'one-per-athlete')}
                className={`px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                  activeView === 'one-per-athlete'
                    ? 'bg-[#37352F] text-white'
                    : 'text-[#9B9A97] hover:bg-[#F7F7F5]'
                }`}
                title="Best per Athlete"
              >
                Best
              </button>
              <button
                onClick={() => setActiveView(testTypeKey, 'unlimited')}
                className={`px-1.5 py-0.5 text-[9px] font-medium transition-colors border-l border-[#E9E9E7] ${
                  activeView === 'unlimited'
                    ? 'bg-[#37352F] text-white'
                    : 'text-[#9B9A97] hover:bg-[#F7F7F5]'
                }`}
                title="All Times"
              >
                All
              </button>
            </div>
          </div>
          {onStartTest && (
            <button
              onClick={() => onStartTest(testType)}
              className="flex items-center gap-1 px-2.5 py-1 border border-[#E9E9E7] text-[#37352F] rounded text-xs font-medium hover:bg-[#F7F7F5] transition-colors"
            >
              <Play size={12} /> Start
            </button>
          )}
        </div>

        {/* Card Content */}
        {topEntries.length === 0 ? (
          <div className="p-6 text-center">
            <Trophy className="mx-auto mb-2 text-[#9B9A97]" size={28} />
            <p className="text-xs text-[#9B9A97]">No entries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E9E9E7] max-h-96 overflow-y-auto">
            {topEntries.map((entry, index) => {
              const rank = index + 1;
              const isUserEntry = entry.userId === user?.uid;

              return (
                <div
                  key={entry.id}
                  className={`px-3 py-2 flex items-center justify-between ${
                    isUserEntry ? 'bg-blue-50' : 'hover:bg-[#F7F7F5]'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-5">
                      {getRankMedal(rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[#37352F] text-sm truncate">{entry.athleteName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#9B9A97]">
                        {getGenderBadge(entry.athleteGender)}
                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#37352F] text-sm">{entry.time.toFixed(3)}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card Footer - Show count if more than 20 */}
        {filteredEntries.length > 20 && (
          <div className="bg-[#F7F7F5] border-t border-[#E9E9E7] px-3 py-1.5 text-center">
            <span className="text-[11px] text-[#9B9A97]">+{filteredEntries.length - 20} more entries</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Trophy className="text-[#37352F]" size={28} />
          <h1 className="text-2xl font-serif font-bold text-[#37352F]">Global Leaderboard</h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 mb-6">
        {/* Left side - 2x2 Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testTypes.map(type => (
              <div key={type.value}>
                {renderLeaderboardCard(type.label, type.testType, type.entries, type.value)}
              </div>
            ))}
          </div>

          {/* Info Footer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> Top 20 results shown per test. Only the top 100 fastest times are stored. To add your athlete's result,
              complete a test and use the "Post to Leaderboard" button in the analysis view.
            </p>
          </div>
        </div>

        {/* Right side - My Entries */}
        <div className="w-72 flex-shrink-0">
          <div className="sticky top-4">
            <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden shadow-sm">
              {/* Header */}
              <div className="bg-[#F7F7F5] border-b border-[#E9E9E7] px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-[#37352F] text-base">My Leaderboard Entries</h3>
                    <p className="text-[11px] text-[#9B9A97] mt-0.5">{userEntriesWithRanks.length} total entries</p>
                  </div>
                  {user && userEntriesWithRanks.length > 0 && !deleteMode && (
                    <button
                      onClick={() => setDeleteMode(true)}
                      className="p-1.5 hover:bg-[#E9E9E7] rounded transition-colors text-[#787774] hover:text-[#37352F]"
                      title="Manage entries"
                    >
                      <MoreVertical size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Delete Mode Actions */}
              {deleteMode && (
                <div className="bg-red-50 border-b border-red-200 px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-red-900 font-medium">
                    {selectedEntries.size > 0 ? `${selectedEntries.size} selected` : 'Select entries to delete'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelDeleteMode}
                      className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedEntries.size === 0 || isDeleting}
                      className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Content */}
              {!user ? (
                <div className="p-6 text-center">
                  <Trophy className="mx-auto mb-2 text-[#9B9A97]" size={28} />
                  <p className="text-xs text-[#9B9A97]">Sign in to view your entries</p>
                </div>
              ) : userEntriesWithRanks.length === 0 ? (
                <div className="p-6 text-center">
                  <Trophy className="mx-auto mb-2 text-[#9B9A97]" size={28} />
                  <p className="text-xs text-[#9B9A97]">No entries yet</p>
                  <p className="text-[11px] text-[#787774] mt-1.5">Complete a test and post it to the leaderboard!</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E9E9E7] max-h-[600px] overflow-y-auto">
                  {userEntriesWithRanks.map(entry => {
                    const isTopThree = entry.rank <= 3;
                    const isSelected = selectedEntries.has(entry.id);

                    return (
                      <div
                        key={entry.id}
                        onClick={() => deleteMode && toggleEntrySelection(entry.id)}
                        className={`px-2.5 py-1.5 transition-colors ${
                          deleteMode ? 'cursor-pointer' : ''
                        } ${
                          isSelected ? 'bg-red-50' : 'hover:bg-[#F7F7F5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {deleteMode && (
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-red-600 border-red-600' : 'border-[#E9E9E7]'
                              }`}>
                                {isSelected && <Check size={12} className="text-white" />}
                              </div>
                            )}
                            <span className="text-[#37352F] text-[11px]">{getTestLabel(entry.testType)}</span>
                            {isTopThree && getRankMedal(entry.rank)}
                          </div>
                        </div>
                        <p className="text-[10px] text-[#9B9A97] mb-1">{entry.athleteName}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-[#37352F] text-xs">{entry.time.toFixed(3)}s</span>
                            {getGenderBadge(entry.athleteGender)}
                            <span className="text-[9px] text-[#9B9A97]">{new Date(entry.date).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-medium ${isTopThree ? 'text-yellow-600' : 'text-[#9B9A97]'}`}>
                              #{entry.rank}/{entry.totalEntries}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
