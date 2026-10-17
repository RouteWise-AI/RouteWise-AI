import React from 'react';
import {
  GitCompare,
  TrendingUp,
  Clock,
  Coins,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Leaf,
  ShieldCheck,
  Download,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import jsPDF from 'jspdf';
import type { ComparisonResult, EvaluatedOption } from '../types';
import { ModeBadge, DeadlineBadge } from '../components/Badge';
import { TradeoffRadar } from '../components/TradeoffRadar';
import { useToast } from '../components/Toast';

interface ComparisonPageProps {
  result: ComparisonResult | null;
  onNavigateToWorkspace: () => void;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({ result, onNavigateToWorkspace }) => {
  const { showSuccess } = useToast();

  if (!result) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <GitCompare className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
        <h3 className="text-lg font-bold text-white">No Comparison Data Available</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Please run a journey comparison in the Command Center first to inspect candidate alternatives.
        </p>
        <button
          onClick={onNavigateToWorkspace}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer"
        >
          Open Command Center
        </button>
      </div>
    );
  }

  // Prepare chart data for Recharts
  const chartData = result.alternatives.map((alt) => ({
    name: alt.option.name.split(' ')[0] + ` (${alt.option.mode})`,
    cost: alt.cost.total_cost_inr,
    duration: alt.deadline.estimated_duration_hours,
    isFeasible: alt.constraints.overall_feasible,
    isRecommended: alt.is_recommended,
  }));

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RouteWise AI — Logistics Decision Report', 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Corridor: ${result.origin} -> ${result.destination}`, 14, 34);
    doc.text(`Budget Constraint: Rs. ${result.budget_inr.toLocaleString()} | Deadline: ${result.deadline_hours} hours | Priority: ${result.priority}`, 14, 40);

    if (result.recommended_option) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RECOMMENDED OPTION (MCP Optimal Selection):', 14, 52);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Option: ${result.recommended_option.option.name}`, 14, 58);
      doc.text(`Carrier: ${result.recommended_option.option.carrier} (${result.recommended_option.option.mode})`, 14, 64);
      doc.text(`Total Cost: Rs. ${result.recommended_option.cost.total_cost_inr.toLocaleString()}`, 14, 70);
      doc.text(`Transit Time: ${result.recommended_option.deadline.estimated_duration_hours} hrs (Est Arrival: ${result.recommended_option.deadline.estimated_arrival_time})`, 14, 76);
      doc.text(`Reliability Score: ${Math.round(result.recommended_option.option.reliability_score * 100)}% | Carbon: ${result.recommended_option.option.carbon_emissions_kg} kg CO2`, 14, 82);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ALL EVALUATED CANDIDATE ALTERNATIVES:', 14, 96);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    let y = 104;
    result.alternatives.forEach((alt, idx) => {
      const status = alt.is_recommended ? '[RECOMMENDED]' : alt.constraints.overall_feasible ? '[FEASIBLE]' : '[INFEASIBLE]';
      doc.text(`${idx + 1}. ${status} ${alt.option.name} | Rs. ${alt.cost.total_cost_inr} | ${alt.deadline.estimated_duration_hours}h | ${alt.deadline.status}`, 14, y);
      y += 6.5;
    });

    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text(`Decision Rationale: ${result.refusal_or_tradeoff_explanation.slice(0, 220)}...`, 14, y, { maxWidth: 180 });

    doc.save(`RouteWise_Decision_${result.origin}_${result.destination}.pdf`);
    showSuccess('Logistics Decision PDF report downloaded successfully!');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Journey Alternatives & Tradeoffs
          </h1>
          <p className="text-sm text-slate-400">
            Multimodal evaluation for corridor: <strong className="text-cyan-300">{result.origin} → {result.destination}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Budget Limit: <strong className="text-emerald-400">₹{result.budget_inr.toLocaleString()}</strong>
          </span>
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Deadline: <strong className="text-cyan-300">{result.deadline_hours} hrs</strong>
          </span>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Visual Charts: Cost vs Duration + Multi-Criteria Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Comparison Bar Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              Total Freight Cost (₹ INR)
            </h3>
            <span className="text-xs text-slate-400">Lower is cheaper</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Cost']}
                />
                <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isRecommended ? '#06b6d4' : entry.isFeasible ? '#3b82f6' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Duration Comparison Bar Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Transit Duration (Hours)
            </h3>
            <span className="text-xs text-slate-400">Lower is faster</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${val} hours`, 'Duration']}
                />
                <Bar dataKey="duration" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-dur-${index}`}
                      fill={entry.isRecommended ? '#06b6d4' : entry.isFeasible ? '#6366f1' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Multi-Criteria Tradeoff Radar Chart */}
      <TradeoffRadar
        alternatives={result.alternatives}
        budgetInr={result.budget_inr}
        deadlineHours={result.deadline_hours}
      />

      {/* Comprehensive Alternatives Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Full Comparative Breakdown</h3>
          <span className="text-xs text-slate-400">
            {result.feasible_count} of {result.total_evaluated} options feasible
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Carrier & Option</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Departure & Arrival</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4">Deadline Margin</th>
                <th className="py-3 px-4">Reliability</th>
                <th className="py-3 px-4">Carbon</th>
                <th className="py-3 px-4">Decision Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {result.alternatives.map((alt) => (
                <tr
                  key={alt.option.id}
                  className={`hover:bg-slate-800/30 transition-all ${
                    alt.is_recommended ? 'bg-blue-950/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{alt.option.name}</div>
                    <div className="text-[11px] text-slate-400">{alt.option.carrier}</div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <ModeBadge mode={alt.option.mode} />
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                    <div>{alt.deadline.departure_time}</div>
                    <div className="text-[11px] text-cyan-400">Arr: {alt.deadline.estimated_arrival_time}</div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap font-medium text-white">
                    {alt.deadline.estimated_duration_hours} hrs
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-white">₹{alt.cost.total_cost_inr.toLocaleString()}</span>
                    {alt.cost.weight_surcharge_inr > 0 && (
                      <span className="text-[10px] text-slate-400 block">
                        (+₹{alt.cost.weight_surcharge_inr} wt fee)
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <DeadlineBadge
                      status={alt.deadline.status}
                      marginHours={alt.deadline.margin_hours}
                    />
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-cyan-300 font-medium">
                    {Math.round(alt.option.reliability_score * 100)}%
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                    {alt.option.carbon_emissions_kg} kg
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {alt.is_recommended ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        RECOMMENDED
                      </span>
                    ) : alt.constraints.overall_feasible ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                        Feasible Alternative
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 cursor-help"
                        title={alt.constraints.rejection_reasons.join(', ')}
                      >
                        Infeasible ({alt.constraints.rejection_reasons[0]?.split(':')[0] || 'Constraint Violated'})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
