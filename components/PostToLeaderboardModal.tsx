import React, { useState } from 'react';
import { X, Trophy, AlertCircle } from 'lucide-react';

interface PostToLeaderboardModalProps {
  isOpen: boolean;
  testType: string;
  athleteName: string;
  athleteGender?: string;
  time: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const PostToLeaderboardModal: React.FC<PostToLeaderboardModalProps> = ({
  isOpen,
  testType,
  athleteName,
  athleteGender,
  time,
  onClose,
  onConfirm
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const getTestLabel = (type: string): string => {
    switch (type) {
      case 'FORTY_YARD_DASH': return '40 Yard Dash';
      case 'ACCELERATION_30M': return '30m Acceleration';
      case 'FLY_30M': return '30m Flying';
      case 'SIXTY_METER_RUN': return '60m Run';
      default: return type;
    }
  };

  const handleSubmit = async () => {
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await onConfirm();
      setIsConfirmed(false);
      onClose();
    } catch (error) {
      console.error('Failed to post to leaderboard:', error);
      // Error is handled in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-[#E9E9E7]">

        <div className="p-6 border-b border-[#E9E9E7] flex justify-between items-center bg-[#F7F7F5]">
          <div className="flex items-center gap-3">
            <Trophy className="text-[#37352F]" size={24} />
            <div>
              <h2 className="text-xl font-serif font-bold text-[#37352F]">Post to Leaderboard</h2>
              <p className="text-xs text-[#787774]">Share this result publicly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#E9E9E7] rounded text-[#787774] hover:text-[#37352F] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Result Summary */}
          <div className="bg-[#F7F7F5] rounded-lg p-4 border border-[#E9E9E7]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-[#9B9A97] uppercase mb-1">Test Type</div>
                <div className="text-sm font-medium text-[#37352F]">{getTestLabel(testType)}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#9B9A97] uppercase mb-1">Athlete</div>
                <div className="text-sm font-medium text-[#37352F]">
                  {athleteName}
                  {athleteGender && <span className="text-[#9B9A97] ml-2">({athleteGender})</span>}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E9E9E7]">
              <div className="text-xs font-bold text-[#9B9A97] uppercase mb-1">Time</div>
              <div className="text-3xl font-bold text-[#37352F]">{time.toFixed(3)}s</div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-blue-900 mb-1">Public Leaderboard</div>
              <p className="text-xs text-blue-800">
                This result will be publicly visible on the global leaderboard. Anyone can view
                the athlete's name, gender, time, and date. You can delete this entry at any time.
              </p>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[#E9E9E7] text-[#37352F] focus:ring-[#37352F]"
            />
            <span className="text-sm text-[#37352F]">
              I confirm that this result is accurate and can be publicly displayed on the leaderboard.
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-[#787774] text-sm font-medium hover:bg-[#F7F7F5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isConfirmed || isSubmitting}
              className="bg-[#37352F] text-white px-6 py-2 rounded text-sm font-medium hover:bg-[#2F2F2F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trophy size={16} />
              {isSubmitting ? 'Posting...' : 'Post to Leaderboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostToLeaderboardModal;
