
import React, { useState } from 'react';
import { Athlete, TrainingSession, RunSession, AppSettings } from '../types';
import { ArrowLeft, Edit2, Trash2, Calendar, Activity, TrendingUp, Users, FileDown } from 'lucide-react';
import { TestType } from '../constants';
import { generateAthleteReport } from '../services/pdfReportsEnhanced';

interface AthleteDetailProps {
  athlete: Athlete;
  allSessions: TrainingSession[];
  settings: AppSettings;
  onBack: () => void;
  onEdit: (athlete: Athlete) => void;
  onDelete: (athleteId: string) => void;
  onSelectRun: (run: RunSession) => void;
}

const AthleteDetail: React.FC<AthleteDetailProps> = ({
  athlete,
  allSessions,
  settings,
  onBack,
  onEdit,
  onDelete,
  onSelectRun
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get all runs for this athlete
  const athleteRuns = allSessions
    .flatMap(session =>
      session.runs
        .filter(run => run.athleteId === athlete.id)
        .map(run => ({ ...run, sessionDate: session.date, sessionName: session.name }))
    )
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

  // Calculate statistics
  const totalRuns = athleteRuns.length;
  const testTypes = new Set(athleteRuns.map(r => r.config.type)).size;

  // Get max speed across all runs
  const maxSpeed = athleteRuns.length > 0
    ? Math.max(...athleteRuns.flatMap(r => r.data.map(d => d.speed)))
    : 0;

  const handleDelete = async () => {
    await onDelete(athlete.id);
    onBack();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (settings.dateFormat) {
      case 'MM.DD.YYYY':
        return date.toLocaleDateString('en-US');
      case 'DD.MM.YYYY':
        return date.toLocaleDateString('en-GB');
      case 'YYYY-MM-DD':
        return date.toISOString().split('T')[0];
      default:
        return date.toLocaleDateString();
    }
  };

  const convertSpeed = (mps: number): string => {
    switch (settings.speedUnit) {
      case 'kph':
        return (mps * 3.6).toFixed(2);
      case 'mph':
        return (mps * 2.237).toFixed(2);
      default:
        return mps.toFixed(2);
    }
  };

  const getSpeedUnit = (): string => {
    switch (settings.speedUnit) {
      case 'kph': return 'km/h';
      case 'mph': return 'mph';
      default: return 'm/s';
    }
  };

  const getTestTypeLabel = (type: TestType): string => {
    switch (type) {
      case TestType.FREE_RUN: return 'Free Run';
      case TestType.ACCELERATION: return 'Acceleration';
      case TestType.FLY: return 'Fly';
      case TestType.POLE_VAULT: return 'Pole Vault';
      case TestType.LONG_JUMP: return 'Long Jump';
      default: return type;
    }
  };

  const calculateAge = () => {
    if (!athlete.dob) return null;
    const today = new Date();
    const birthDate = new Date(athlete.dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#787774] hover:text-[#37352F] mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Athletes
        </button>

        <div className="bg-white border border-[#E9E9E7] rounded-xl p-8 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#F7F7F5] text-[#37352F] font-serif font-bold text-3xl flex items-center justify-center border-2 border-[#E9E9E7]">
                {athlete.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2">{athlete.name}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-[#787774]">
                  {athlete.primaryEvent && (
                    <span className="px-3 py-1 bg-[#F7F7F5] rounded-full font-medium">{athlete.primaryEvent}</span>
                  )}
                  {athlete.gender && <span>{athlete.gender}</span>}
                  {calculateAge() && <span>{calculateAge()} years old</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => generateAthleteReport(athlete, allSessions, settings)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 shadow-sm text-sm"
              >
                <FileDown size={16} /> Download Report
              </button>
              <button
                onClick={() => onEdit(athlete)}
                className="p-2 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-[#787774] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#F7F7F5] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-bold uppercase mb-1">
                <Activity size={14} />
                Total Runs
              </div>
              <div className="text-2xl font-bold text-[#37352F]">{totalRuns}</div>
            </div>

            <div className="bg-[#F7F7F5] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-bold uppercase mb-1">
                <Users size={14} />
                Test Types
              </div>
              <div className="text-2xl font-bold text-[#37352F]">{testTypes}</div>
            </div>

            <div className="bg-[#F7F7F5] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-bold uppercase mb-1">
                <TrendingUp size={14} />
                Max Speed
              </div>
              <div className="text-2xl font-bold text-[#37352F]">
                {maxSpeed > 0 ? convertSpeed(maxSpeed) : '--'}
                <span className="text-sm text-[#9B9A97] ml-1">{getSpeedUnit()}</span>
              </div>
            </div>

            {athlete.pb100m && (
              <div className="bg-[#F7F7F5] rounded-lg p-4">
                <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-bold uppercase mb-1">
                  100m PB
                </div>
                <div className="text-2xl font-bold text-[#37352F]">
                  {athlete.pb100m.toFixed(2)}
                  <span className="text-sm text-[#9B9A97] ml-1">s</span>
                </div>
              </div>
            )}
          </div>

          {athlete.email && (
            <div className="mt-4 pt-4 border-t border-[#E9E9E7]">
              <span className="text-xs text-[#9B9A97] uppercase font-bold">Email: </span>
              <span className="text-sm text-[#787774]">{athlete.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Test History */}
      <div>
        <h2 className="text-xl font-serif font-bold text-[#37352F] mb-4">Test History</h2>

        {athleteRuns.length === 0 ? (
          <div className="bg-[#F7F7F5] rounded-lg border border-dashed border-[#E9E9E7] p-12 text-center">
            <Activity className="mx-auto mb-4 text-[#9B9A97]" size={48} />
            <p className="text-[#9B9A97]">No test data recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E9E9E7] rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-[#E9E9E7]">
              {athleteRuns.map((run: any) => {
                const maxRunSpeed = Math.max(...run.data.map((d: any) => d.speed));
                return (
                  <div
                    key={run.id}
                    onClick={() => onSelectRun(run)}
                    className="p-4 hover:bg-[#F7F7F5] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-[#37352F] text-white text-xs font-medium rounded">
                            {getTestTypeLabel(run.config.type)}
                          </span>
                          <span className="text-sm font-medium text-[#37352F]">{run.sessionName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#9B9A97]">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(run.sessionDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp size={12} />
                            Max: {convertSpeed(maxRunSpeed)} {getSpeedUnit()}
                          </span>
                        </div>
                      </div>
                      <ArrowLeft size={18} className="text-[#E9E9E7] rotate-180" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-[#E9E9E7] p-6">
            <h3 className="text-xl font-serif font-bold text-[#37352F] mb-2">Delete Athlete?</h3>
            <p className="text-sm text-[#787774] mb-6">
              Are you sure you want to delete <strong>{athlete.name}</strong>? This action cannot be undone.
              Test data will remain in sessions but won't be linked to this athlete.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded text-[#787774] text-sm font-medium hover:bg-[#F7F7F5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteDetail;
