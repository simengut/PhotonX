
import React, { useState, useMemo } from 'react';
import { Athlete, TrainingSession, AppSettings } from '../types';
import { TestType, TEST_TYPES } from '../constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart2, Activity, Calendar, FileDown } from 'lucide-react';
import { generateComparisonReport } from '../services/pdfReportsEnhanced';

interface AnalyticsProps {
  athletes: Athlete[];
  sessions: TrainingSession[];
  settings: AppSettings;
}

// Helper to get final time from run data
const getRunTime = (run: any) => {
  if (!run.data || run.data.length === 0) return null;
  // Get the last data point's timestamp (in seconds)
  const lastPoint = run.data[run.data.length - 1];
  return lastPoint.timestamp / 1000; // Convert ms to seconds
};

const Analytics: React.FC<AnalyticsProps> = ({ athletes, sessions, settings }) => {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [selectedTestType, setSelectedTestType] = useState<TestType>(TestType.FORTY_YARD_DASH);
  const [dateRange, setDateRange] = useState<number>(90); // days

  // Process data for selected athlete and test type
  const analyticsData = useMemo(() => {
    if (!selectedAthleteId) return null;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);

    // Get all runs for selected athlete and test type
    const allRuns = sessions
      .flatMap(s => s.runs.map(r => ({ ...r, sessionDate: s.date })))
      .filter(r => {
        const time = getRunTime(r);
        return (
          r.athleteId === selectedAthleteId &&
          r.config?.type === selectedTestType &&
          time !== null &&
          new Date(r.sessionDate) >= cutoffDate
        );
      })
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());

    if (allRuns.length === 0) return null;

    // Calculate statistics
    const times = allRuns.map(r => getRunTime(r)!);
    const bestTime = Math.min(...times);
    const worstTime = Math.max(...times);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    // Calculate improvement (positive = getting faster)
    const firstTime = times[0];
    const lastTime = times[times.length - 1];
    const improvement = ((firstTime - lastTime) / firstTime) * 100;

    // Calculate standard deviation (consistency)
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    // Prepare chart data
    const chartData = allRuns.map((run, index) => ({
      date: new Date(run.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: getRunTime(run)!,
      index: index + 1
    }));

    return {
      runs: allRuns,
      times,
      bestTime,
      worstTime,
      avgTime,
      improvement,
      stdDev,
      chartData,
      totalRuns: allRuns.length
    };
  }, [selectedAthleteId, selectedTestType, dateRange, sessions]);

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart2 className="text-[#37352F]" size={32} />
          <h1 className="text-3xl font-serif font-bold text-[#37352F]">Performance Analytics</h1>
        </div>
        <p className="text-[#787774]">Track progress and trends over time.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E9E7] rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#37352F]">Filters</h3>
          {selectedAthleteId && (
            <button
              onClick={() => {
                const athletesToCompare = athletes.filter(a => a.id === selectedAthleteId);
                generateComparisonReport(
                  athletesToCompare,
                  sessions,
                  selectedTestType,
                  TEST_TYPES[selectedTestType].label
                );
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 shadow-sm"
            >
              <FileDown size={14} /> Export Report
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Athlete Selector */}
          <div>
            <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-2">Athlete</label>
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E9E7] rounded bg-white text-sm focus:outline-none focus:border-[#37352F]"
            >
              <option value="">Select an athlete...</option>
              {athletes.map(athlete => (
                <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
              ))}
            </select>
          </div>

          {/* Test Type Selector */}
          <div>
            <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-2">Test Type</label>
            <select
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value as TestType)}
              className="w-full px-3 py-2 border border-[#E9E9E7] rounded bg-white text-sm focus:outline-none focus:border-[#37352F]"
            >
              <option value={TestType.FORTY_YARD_DASH}>{TEST_TYPES[TestType.FORTY_YARD_DASH].label}</option>
              <option value={TestType.ACCELERATION}>{TEST_TYPES[TestType.ACCELERATION].label}</option>
              <option value={TestType.FLY}>{TEST_TYPES[TestType.FLY].label}</option>
              <option value={TestType.SIXTY_METER_RUN}>{TEST_TYPES[TestType.SIXTY_METER_RUN].label}</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div>
            <label className="block text-xs font-bold text-[#9B9A97] uppercase mb-2">Time Period</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[#E9E9E7] rounded bg-white text-sm focus:outline-none focus:border-[#37352F]"
            >
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={180}>Last 6 Months</option>
              <option value={365}>Last Year</option>
              <option value={9999}>All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {!selectedAthleteId ? (
        <div className="bg-white border border-[#E9E9E7] rounded-xl p-12 text-center">
          <Activity className="mx-auto mb-4 text-[#9B9A97]" size={48} />
          <h3 className="text-lg font-medium text-[#37352F] mb-2">Select an Athlete</h3>
          <p className="text-sm text-[#787774]">Choose an athlete from the dropdown above to view their performance analytics.</p>
        </div>
      ) : !analyticsData ? (
        <div className="bg-white border border-[#E9E9E7] rounded-xl p-12 text-center">
          <Calendar className="mx-auto mb-4 text-[#9B9A97]" size={48} />
          <h3 className="text-lg font-medium text-[#37352F] mb-2">No Data Available</h3>
          <p className="text-sm text-[#787774]">
            {selectedAthlete?.name} has no recorded {TEST_TYPES[selectedTestType].label} runs in the selected time period.
          </p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* Best Time */}
            <div className="bg-white border border-[#E9E9E7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-medium mb-2">
                <Target size={14} /> Best Time
              </div>
              <div className="text-2xl font-bold text-[#37352F]">{analyticsData.bestTime.toFixed(3)}s</div>
            </div>

            {/* Average Time */}
            <div className="bg-white border border-[#E9E9E7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-medium mb-2">
                <Activity size={14} /> Average
              </div>
              <div className="text-2xl font-bold text-[#37352F]">{analyticsData.avgTime.toFixed(3)}s</div>
            </div>

            {/* Improvement */}
            <div className="bg-white border border-[#E9E9E7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-medium mb-2">
                {analyticsData.improvement > 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                Improvement
              </div>
              <div className={`text-2xl font-bold ${analyticsData.improvement > 0 ? 'text-green-600' : analyticsData.improvement < 0 ? 'text-red-600' : 'text-[#37352F]'}`}>
                {analyticsData.improvement > 0 ? '+' : ''}{analyticsData.improvement.toFixed(1)}%
              </div>
            </div>

            {/* Total Runs */}
            <div className="bg-white border border-[#E9E9E7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-medium mb-2">
                <BarChart2 size={14} /> Total Runs
              </div>
              <div className="text-2xl font-bold text-[#37352F]">{analyticsData.totalRuns}</div>
            </div>

            {/* Consistency */}
            <div className="bg-white border border-[#E9E9E7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#9B9A97] text-xs font-medium mb-2">
                <Target size={14} /> Consistency
              </div>
              <div className="text-2xl font-bold text-[#37352F]">±{analyticsData.stdDev.toFixed(3)}s</div>
              <div className="text-[10px] text-[#9B9A97] mt-1">Std Deviation</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-[#E9E9E7] rounded-xl p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="font-serif font-bold text-lg text-[#37352F] mb-1">Performance Trend</h3>
              <p className="text-sm text-[#787774]">
                {selectedAthlete?.name} • {TEST_TYPES[selectedTestType].label}
              </p>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analyticsData.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" />
                <XAxis
                  dataKey="date"
                  stroke="#9B9A97"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9B9A97"
                  style={{ fontSize: '12px' }}
                  domain={['dataMin - 0.05', 'dataMax + 0.05']}
                  tickFormatter={(value) => `${value.toFixed(2)}s`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E9E9E7',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value.toFixed(3)}s`, 'Time']}
                />
                <ReferenceLine
                  y={analyticsData.avgTime}
                  stroke="#9B9A97"
                  strokeDasharray="3 3"
                  label={{ value: 'Average', position: 'right', fill: '#9B9A97', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#37352F"
                  strokeWidth={2}
                  dot={{ fill: '#37352F', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-[#37352F]"></div>
                <span className="text-[#787774]">Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-[#9B9A97] border-dashed border-t"></div>
                <span className="text-[#787774]">Average</span>
              </div>
            </div>
          </div>

          {/* Additional Insights */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Insight:</strong> {analyticsData.improvement > 2 ? (
                `Great progress! ${selectedAthlete?.name} has improved by ${analyticsData.improvement.toFixed(1)}% over the selected period.`
              ) : analyticsData.improvement > 0 ? (
                `${selectedAthlete?.name} is showing steady improvement. Keep up the consistent training!`
              ) : analyticsData.improvement < -2 ? (
                `Performance has declined. Consider reviewing training load and recovery.`
              ) : (
                `Performance is stable. Focus on consistency and technique refinement.`
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
