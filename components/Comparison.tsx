
import React, { useMemo } from 'react';
import { RunSession, Athlete, AppSettings, DataPoint } from '../types';
import { TestType, UNIT_LABELS } from '../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, LineChart, Line } from 'recharts';
import { ArrowLeft, GitCompare, Zap, Ruler, Timer, Activity } from 'lucide-react';

interface ComparisonProps {
  runs: RunSession[];
  athletes: Athlete[];
  settings: AppSettings;
  onBack: () => void;
}

// --- Helpers (Duplicated for self-containment or import from utils if we had one) ---
const convertSpeed = (mps: number, unit: string) => {
    if (unit === 'kph') return mps * 3.6;
    if (unit === 'mph') return mps * 2.23694;
    return mps;
};

const convertDist = (meters: number, unit: string) => {
    if (unit === 'imperial') return meters * 1.09361;
    return meters;
};

const COLORS = ['#37352F', '#E16259', '#2563EB', '#16A34A', '#D97706'];

const Comparison: React.FC<ComparisonProps> = ({ runs, athletes, settings, onBack }) => {
  
  // 1. Prepare Chart Data
  // We need to normalize data points to a common X-axis (Distance)
  const chartData = useMemo(() => {
      const mergedData: any[] = [];
      
      // Find the run with the max distance to define the domain
      let maxDist = 0;
      runs.forEach(r => {
          const runMax = r.data[r.data.length - 1]?.distance || 0;
          if (runMax > maxDist) maxDist = runMax;
      });

      // Create buckets every 0.2m (or 0.5m) for smoother comparison
      const step = 0.2;
      
      // Determine X-Axis start (for Relative vs Absolute)
      // If any run has board location, we try to align by board location (0).
      // Complexity: If one run has board at 40m and another at 30m, we shift X axis.
      const useRelative = runs.every(r => r.config.boardLocation);
      
      let startX = 0;
      let endX = maxDist;

      if (useRelative) {
          // Find min relative start and max relative end
          startX = -50; // Arbitrary ample buffer for runup
          endX = 20; // Buffer after takeoff
      }

      // Simple approach: Interpolate every 'step' meters for each run
      // If useRelative, we iterate through relative distance
      
      // Generate Steps
      // Note: This is a simplified resampler. 
      for (let d = 0; d <= maxDist; d += step) {
          const point: any = { distance: d };
          
          runs.forEach((run, idx) => {
             // Find data point closest to distance 'd'
             // Note: run.data is time-series, but distance usually increases monotonic
             // We find the index where distance is closest
             
             let val = null;
             
             // Optimization: Find roughly where d is
             // Simple search for now:
             const p = run.data.find(p => p.distance >= d);
             if (p) {
                 // Basic interpolation could go here, but raw finding is okay for 0.2m steps
                 val = p.speed;
             }

             if (val !== null) {
                point[`run_${run.id}`] = val;
             }
          });
          mergedData.push(point);
      }
      
      // Better Approach for Recharts with Multiple X-Axis alignments:
      // Actually, Recharts 'LineChart' with type='number' XAxis can handle non-aligned data 
      // if we pass different data arrays to different Lines? No, simpler to provide one big array.
      
      // Let's stick to the resampled array above, but refined.
      return mergedData;
  }, [runs]);

  // 2. Calculate Comparative Stats
  const stats = runs.map(run => {
      const maxSpeed = Math.max(...run.data.map(d => d.speed));
      const maxDist = Math.max(...run.data.map(d => d.distance));
      const totalTime = run.data[run.data.length - 1]?.timestamp / 1000 || 0;
      
      return {
          id: run.id,
          athleteId: run.athleteId,
          maxSpeed,
          maxDist,
          totalTime,
          jumpResult: run.jumpResult
      };
  });

  const speedLabel = UNIT_LABELS.speed[settings.speedUnit];
  const distLabel = UNIT_LABELS.distance[settings.distanceUnit];

  return (
    <div className="max-w-6xl mx-auto pb-12 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
            <div>
                <button onClick={onBack} className="text-[#787774] hover:text-[#37352F] flex items-center gap-2 text-sm mb-4 transition-colors">
                    <ArrowLeft size={16} /> Back
                </button>
                <h1 className="text-3xl font-serif font-bold text-[#37352F] flex items-center gap-3">
                    <GitCompare size={28} className="text-[#9B9A97]" />
                    Compare Runs
                </h1>
            </div>
        </div>

        {/* Legend / Selector Summary */}
        <div className="flex flex-wrap gap-4 mb-8">
            {runs.map((run, idx) => {
                const athlete = athletes.find(a => a.id === run.athleteId);
                return (
                    <div key={run.id} className="flex items-center gap-3 bg-white border border-[#E9E9E7] px-4 py-2 rounded-full shadow-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <div>
                            <div className="text-sm font-bold text-[#37352F]">{athlete?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-[#9B9A97]">{new Date(run.date).toLocaleDateString()} • {run.config.type.replace('_', ' ')}</div>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Chart */}
        <div className="bg-white border border-[#E9E9E7] rounded-xl p-6 h-96 shadow-sm mb-8">
            <h3 className="text-sm font-bold text-[#37352F] font-serif mb-6">Velocity Overlay</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F7F7F5" vertical={false} />
                    <XAxis 
                        dataKey="distance" 
                        type="number" 
                        unit="m" 
                        domain={['auto', 'auto']} 
                        tickFormatter={(val) => convertDist(val, settings.distanceUnit).toFixed(0)}
                        label={{ value: `Distance (${distLabel})`, position: 'insideBottom', offset: -5, fontSize: 10, fill: '#9B9A97' }}
                        stroke="#E9E9E7"
                        tick={{fill: '#9B9A97', fontSize: 12}}
                    />
                    <YAxis 
                        stroke="#E9E9E7" 
                        tick={{fill: '#9B9A97', fontSize: 12}}
                        label={{ value: `Speed (${speedLabel})`, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9B9A97' }}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderColor: '#E9E9E7', color: '#37352F' }} 
                        formatter={(val: number) => convertSpeed(val, settings.speedUnit).toFixed(2)}
                        labelFormatter={(val) => `${Number(val).toFixed(1)}m`}
                    />
                    
                    {runs.map((run, idx) => (
                        <Line 
                            key={run.id}
                            type="monotone" 
                            dataKey={`run_${run.id}`} 
                            stroke={COLORS[idx % COLORS.length]} 
                            strokeWidth={2} 
                            dot={false}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>

        {/* Comparison Table */}
        <div className="bg-white border border-[#E9E9E7] rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#E9E9E7] bg-[#F7F7F5]">
                <h3 className="font-serif font-bold text-[#37352F]">Performance Metrics</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#E9E9E7]">
                            <th className="px-6 py-3 text-left font-medium text-[#9B9A97] bg-gray-50 w-32">Metric</th>
                            {runs.map((run, idx) => {
                                const athlete = athletes.find(a => a.id === run.athleteId);
                                return (
                                    <th key={run.id} className="px-6 py-3 text-left font-bold text-[#37352F]" style={{ color: COLORS[idx % COLORS.length] }}>
                                        {athlete?.name.split(' ')[0]} <span className="text-[10px] font-normal opacity-70">{new Date(run.date).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}</span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9E9E7]">
                        {/* Max Speed */}
                        <tr className="hover:bg-[#F7F7F5]">
                            <td className="px-6 py-4 font-medium text-[#787774] flex items-center gap-2"><Zap size={14}/> Top Speed</td>
                            {stats.map(s => (
                                <td key={s.id} className="px-6 py-4 font-mono font-bold text-[#37352F]">
                                    {convertSpeed(s.maxSpeed, settings.speedUnit).toFixed(2)} <span className="text-xs font-normal text-[#9B9A97]">{speedLabel}</span>
                                </td>
                            ))}
                        </tr>

                        {/* Jump Result (if applicable) */}
                        {runs.some(r => r.jumpResult) && (
                             <tr className="hover:bg-[#F7F7F5]">
                                <td className="px-6 py-4 font-medium text-[#787774] flex items-center gap-2"><Ruler size={14}/> Result</td>
                                {stats.map(s => (
                                    <td key={s.id} className="px-6 py-4 font-mono font-bold text-[#37352F]">
                                        {s.jumpResult ? (
                                            <span className={s.jumpResult.successful === false ? 'text-red-500' : ''}>
                                                {s.jumpResult.resultMetric.toFixed(2)}m {s.jumpResult.successful === false && '(X)'}
                                            </span>
                                        ) : '-'}
                                    </td>
                                ))}
                            </tr>
                        )}

                        {/* Total Time */}
                         <tr className="hover:bg-[#F7F7F5]">
                            <td className="px-6 py-4 font-medium text-[#787774] flex items-center gap-2"><Timer size={14}/> Duration</td>
                            {stats.map(s => (
                                <td key={s.id} className="px-6 py-4 font-mono text-[#37352F]">
                                    {s.totalTime.toFixed(2)}s
                                </td>
                            ))}
                        </tr>

                        {/* Total Distance */}
                        <tr className="hover:bg-[#F7F7F5]">
                            <td className="px-6 py-4 font-medium text-[#787774] flex items-center gap-2"><Activity size={14}/> Distance</td>
                            {stats.map(s => (
                                <td key={s.id} className="px-6 py-4 font-mono text-[#37352F]">
                                    {convertDist(s.maxDist, settings.distanceUnit).toFixed(2)} <span className="text-xs font-normal text-[#9B9A97]">{distLabel}</span>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
  );
};

export default Comparison;
