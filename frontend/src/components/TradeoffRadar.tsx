import React from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { EvaluatedOption } from '../types';

interface TradeoffRadarProps {
  alternatives: EvaluatedOption[];
  budgetInr: number;
  deadlineHours: number;
}

const OPTION_COLORS = ['#06b6d4', '#3b82f6', '#a78bfa', '#f59e0b'];

export const TradeoffRadar: React.FC<TradeoffRadarProps> = ({ alternatives, budgetInr, deadlineHours }) => {
  const feasible = alternatives.filter(a => a.constraints.overall_feasible);
  if (feasible.length === 0) return null;

  // Normalize values to 0-100 scale
  const maxCost = Math.max(...alternatives.map(a => a.cost.total_cost_inr));
  const maxDuration = Math.max(...alternatives.map(a => a.deadline.estimated_duration_hours));

  const radarData = [
    { criterion: 'Cost Efficiency', ...Object.fromEntries(feasible.map(a => [a.option.id, Math.round((1 - a.cost.total_cost_inr / maxCost) * 100)])) },
    { criterion: 'Speed', ...Object.fromEntries(feasible.map(a => [a.option.id, Math.round((1 - a.deadline.estimated_duration_hours / maxDuration) * 100)])) },
    { criterion: 'Reliability', ...Object.fromEntries(feasible.map(a => [a.option.id, Math.round(a.option.reliability_score * 100)])) },
    { criterion: 'Eco Score', ...Object.fromEntries(feasible.map(a => {
      const maxCo2 = Math.max(...alternatives.map(x => x.option.carbon_emissions_kg));
      return [a.option.id, Math.round((1 - a.option.carbon_emissions_kg / maxCo2) * 100)];
    })) },
    { criterion: 'Deadline Margin', ...Object.fromEntries(feasible.map(a => [a.option.id, a.deadline.margin_hours > 0 ? Math.min(100, Math.round((a.deadline.margin_hours / deadlineHours) * 100)) : 0])) },
    { criterion: 'Budget Margin', ...Object.fromEntries(feasible.map(a => [a.option.id, Math.max(0, Math.round(((budgetInr - a.cost.total_cost_inr) / budgetInr) * 100))])) },
  ];

  const shortName = (opt: EvaluatedOption) => {
    const words = opt.option.name.split(' ');
    return words.slice(0, 2).join(' ');
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="text-cyan-400">◈</span>
          Multi-Criteria Tradeoff Radar
        </h3>
        <span className="text-xs text-slate-400">Feasible options only</span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis
              dataKey="criterion"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            {feasible.map((opt, i) => (
              <Radar
                key={opt.option.id}
                name={shortName(opt)}
                dataKey={opt.option.id}
                stroke={OPTION_COLORS[i % OPTION_COLORS.length]}
                fill={OPTION_COLORS[i % OPTION_COLORS.length]}
                fillOpacity={0.12}
                strokeWidth={2}
                dot={{ r: 3, fill: OPTION_COLORS[i % OPTION_COLORS.length] }}
              />
            ))}
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              formatter={(val: any) => [`${val}/100`, '']}
            />
            <Legend
              iconType="line"
              wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-slate-500 mt-2 text-center">
        Higher score = better on each axis. All values normalized 0–100 relative to evaluated options.
      </p>
    </div>
  );
};
