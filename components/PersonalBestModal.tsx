
import React, { useState, useEffect } from 'react';
import { Athlete, RunSession, TrainingSession, LeaderboardEntry } from '../types';
import { Trophy, X, Check, ArrowUp, TrendingUp, AlertCircle } from 'lucide-react';
import { leaderboardService } from '../services/leaderboard';
import { auth } from '../services/firebase';

interface PersonalBest {
  athleteId: string;
  athleteName: string;
  athleteGender?: 'Male' | 'Female' | 'Other';
  testType: 'FORTY_YARD_DASH' | 'ACCELERATION_30M' | 'FLY_30M' | 'SIXTY_METER_RUN';
  testLabel: string;
  newTime: number;
  oldTime: number | null;
  improvement: number;
  sessionId: string;
  runId: string;
  run: RunSession;
}

interface PersonalBestModalProps {
  isOpen: boolean;
  personalBests: PersonalBest[];
  onClose: () => void;
}

const PersonalBestModal: React.FC<PersonalBestModalProps> = ({ isOpen, personalBests, onClose }) => {
  const [selectedPBs, setSelectedPBs] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingEntries, setExistingEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing leaderboard entries to check for duplicates
  useEffect(() => {
    if (!isOpen || !auth.currentUser) {
      setIsLoading(false);
      return;
    }

    const fetchExistingEntries = async () => {
      setIsLoading(true);
      try {
        const entries = await leaderboardService.getUserEntries(auth.currentUser!.uid);
        setExistingEntries(entries);

        // Auto-select only PBs that haven't been posted yet
        const newPBs = personalBests.filter(pb =>
          !entries.some(entry => entry.runId === pb.runId)
        );
        setSelectedPBs(new Set(newPBs.map(pb => pb.runId)));
      } catch (error) {
        console.error('Failed to fetch existing entries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingEntries();
  }, [isOpen, personalBests]);

  // Filter out already posted PBs
  const availablePBs = personalBests.filter(pb =>
    !existingEntries.some(entry => entry.runId === pb.runId)
  );

  const alreadyPostedPBs = personalBests.filter(pb =>
    existingEntries.some(entry => entry.runId === pb.runId)
  );

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#37352F] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[#37352F] font-medium">Checking leaderboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (availablePBs.length === 0 && alreadyPostedPBs.length > 0) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-[#E9E9E7]">
          <div className="p-6 border-b border-[#E9E9E7] bg-gradient-to-br from-yellow-50 to-orange-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Trophy size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#37352F]">Already Posted!</h2>
                <p className="text-sm text-[#787774] mt-1">All personal bests have been submitted</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">These runs are already on the leaderboard:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {alreadyPostedPBs.map(pb => (
                      <li key={pb.runId}>{pb.athleteName} - {pb.testLabel}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#37352F] text-white px-6 py-3 rounded text-sm font-medium hover:bg-[#2F2F2F] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (availablePBs.length === 0) return null;

  const togglePB = (runId: string) => {
    const newSet = new Set(selectedPBs);
    if (newSet.has(runId)) {
      newSet.delete(runId);
    } else {
      newSet.add(runId);
    }
    setSelectedPBs(newSet);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;

    setIsSubmitting(true);
    try {
      const pbsToSubmit = availablePBs.filter(pb => selectedPBs.has(pb.runId));

      for (const pb of pbsToSubmit) {
        const entry = {
          id: `${pb.runId}_${Date.now()}`,
          testType: pb.testType,
          athleteId: pb.athleteId,
          athleteName: pb.athleteName,
          athleteGender: pb.athleteGender,
          userId: auth.currentUser.uid,
          postedBy: 'coach' as const,
          time: pb.newTime,
          date: pb.run.date,
          sessionId: pb.sessionId,
          runId: pb.runId,
          createdAt: new Date().toISOString()
        };

        await leaderboardService.postToLeaderboard(entry);
      }

      onClose();
    } catch (error) {
      console.error('Failed to submit to leaderboard:', error);
      alert('Failed to submit to leaderboard. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-[#E9E9E7]">

        {/* Header */}
        <div className="p-6 border-b border-[#E9E9E7] bg-gradient-to-br from-yellow-50 to-orange-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Trophy size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#37352F]">Personal Best{personalBests.length > 1 ? 's' : ''} Achieved!</h2>
                <p className="text-sm text-[#787774] mt-1">Congratulations! Submit to leaderboard?</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/50 rounded text-[#787774] hover:text-[#37352F] transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Personal Bests List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {alreadyPostedPBs.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-900">
                  <p className="font-medium mb-1">{alreadyPostedPBs.length} run{alreadyPostedPBs.length > 1 ? 's' : ''} already posted (hidden)</p>
                  <p>Only new personal bests are shown below</p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {availablePBs.map((pb) => {
              const isSelected = selectedPBs.has(pb.runId);
              const improvementPercent = pb.oldTime ? ((pb.oldTime - pb.newTime) / pb.oldTime * 100) : null;

              return (
                <div
                  key={pb.runId}
                  onClick={() => togglePB(pb.runId)}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-green-400 bg-green-50'
                      : 'border-[#E9E9E7] bg-white hover:border-[#37352F]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                      isSelected ? 'bg-green-500 border-green-500' : 'border-[#E9E9E7]'
                    }`}>
                      {isSelected && <Check size={16} className="text-white" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-[#37352F] text-lg">{pb.athleteName}</h3>
                          <p className="text-sm text-[#787774]">{pb.testLabel}</p>
                        </div>
                        {pb.oldTime && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                            <ArrowUp size={12} />
                            {improvementPercent ? `${improvementPercent.toFixed(1)}%` : 'New PB'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {pb.oldTime ? (
                          <>
                            <div>
                              <div className="text-xs text-[#9B9A97] uppercase font-bold mb-1">Previous</div>
                              <div className="text-lg font-mono text-[#787774]">{pb.oldTime.toFixed(3)}s</div>
                            </div>
                            <TrendingUp size={20} className="text-green-600" />
                            <div>
                              <div className="text-xs text-[#9B9A97] uppercase font-bold mb-1">New Best</div>
                              <div className="text-2xl font-mono font-bold text-green-600">{pb.newTime.toFixed(3)}s</div>
                            </div>
                          </>
                        ) : (
                          <div>
                            <div className="text-xs text-[#9B9A97] uppercase font-bold mb-1">First Record</div>
                            <div className="text-2xl font-mono font-bold text-green-600">{pb.newTime.toFixed(3)}s</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E9E9E7] bg-[#F7F7F5]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#787774]">
              {selectedPBs.size} of {availablePBs.length} selected for leaderboard
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded text-[#787774] text-sm font-medium hover:bg-[#E9E9E7] transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedPBs.size === 0}
              className="flex-[2] bg-[#37352F] text-white px-6 py-3 rounded text-sm font-medium hover:bg-[#2F2F2F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Trophy size={16} />
              {isSubmitting ? 'Submitting...' : `Submit to Leaderboard (${selectedPBs.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalBestModal;
