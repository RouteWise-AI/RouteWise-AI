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
  AlertTriangle,
  Info,
  MapPin,
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
import { RouteMap, MapLegend } from '../components/RouteMap';
import { useToast } from '../components/Toast';

interface ComparisonPageProps {
  result: ComparisonResult | null;
  onNavigateToWorkspace: () => void;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({ result, onNavigateToWorkspace }) => {
  const { showSuccess, showWarning } = useToast();

  if (!result) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Corridor Comparison Map: Vijayawada → Visakhapatnam
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Showing benchmark coastal multimodal corridor. Run calculations in the Command Center to compare custom cargo constraints.
              </p>
            </div>
            <button
              onClick={onNavigateToWorkspace}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-lg shadow-blue-600/20 whitespace-nowrap"
            >
              Open Command Center →
            </button>
          </div>
          <RouteMap
            activeOrigin="Vijayawada"
            activeDestination="Visakhapatnam"
            segments={[
              { from: 'Vijayawada', to: 'Visakhapatnam', mode: 'RAIL', optionName: 'Andhra Express Freight Rail', carrier: 'Indian Railways Coastal Division', costInr: 1450, durationHours: 4.2 },
              { from: 'Vijayawada', to: 'Visakhapatnam', mode: 'EXPRESS_ROAD', optionName: 'Coastal Highway Express (NH16)', carrier: 'AP Logistics Roadlines', costInr: 1100, durationHours: 5.5 },
              { from: 'Vijayawada', to: 'Visakhapatnam', mode: 'AIR', optionName: 'Regional Air Priority Shuttle', carrier: 'IndiGo Cargo', costInr: 3200, durationHours: 2.3 },
              { from: 'Vijayawada', to: 'Visakhapatnam', mode: 'ROAD', optionName: 'Standard Intercity Freight', carrier: 'Deccan Cargo Carriers', costInr: 750, durationHours: 7.5 },
            ]}
            height="400px"
          />
          <MapLegend />
        </div>
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
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('RouteWise AI — Logistics Decision Report', margin, y);
    y += 6;

    // Subtitle & Edition
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Amazon Developer Hackathon: Build, Ship, Shape Edition | Autonomous Multimodal Decision Agent', margin, y);
    y += 8;

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    // Metadata & Constraints Grid Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'D');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    const leftCol = margin + 4;
    const midCol = margin + 65;
    const rightCol = margin + 125;

    doc.text(`Planning Run ID: ${result.run_id || 'RUN-VERIFIED-01'}`, leftCol, y + 6);
    doc.text(`Corridor: ${result.origin} -> ${result.destination}`, leftCol, y + 13);
    doc.text(`Generated: ${result.created_at || new Date().toLocaleString()}`, leftCol, y + 20);

    doc.text(`Budget Constraint: Rs. ${result.budget_inr.toLocaleString()}`, midCol, y + 6);
    doc.text(`Deadline Window: ${result.deadline_hours} hours`, midCol, y + 13);
    doc.text(`Cargo Weight: ${result.weight_kg || 5.0} kg (${result.shipment_type || 'STANDARD'})`, midCol, y + 20);

    doc.text(`Optimization Priority: ${result.priority}`, rightCol, y + 6);
    doc.text(`Candidates Evaluated: ${result.total_evaluated}`, rightCol, y + 13);
    doc.text(`Feasible Options: ${result.feasible_count} of ${result.total_evaluated}`, rightCol, y + 20);

    y += 34;

    // Recommendation Section
    if (result.has_feasible_solution && result.recommended_option) {
      const rec = result.recommended_option;
      doc.setFillColor(240, 253, 250); // emerald-50
      doc.setDrawColor(52, 211, 153);
      doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(6, 95, 70); // emerald-800
      doc.text('OPTIMAL GROUNDED RECOMMENDATION (MCP Verified Feasible)', leftCol, y + 6);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${rec.option.name} (${rec.option.mode.replace('_', ' ')})`, leftCol, y + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Carrier: ${rec.option.carrier} (Sample carrier profile)`, leftCol, y + 19);
      doc.text(`Estimated Transit: ${rec.deadline.estimated_duration_hours} hrs | Departure: ${rec.deadline.departure_time} | Est Arrival: ${rec.deadline.estimated_arrival_time}`, leftCol, y + 25);
      doc.text(`Calculated Freight Cost: Rs. ${rec.cost.total_cost_inr.toLocaleString()} (Margin: +Rs. ${(result.budget_inr - rec.cost.total_cost_inr).toLocaleString()} saved) | Reliability Assumption: ${Math.round(rec.option.reliability_score * 100)}% | Carbon: ${rec.option.carbon_emissions_kg} kg CO2`, leftCol, y + 30);

      y += 40;
    } else {
      doc.setFillColor(255, 241, 242); // rose-50
      doc.setDrawColor(251, 113, 133);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(159, 18, 57); // rose-800
      doc.text('HONEST INFEASIBILITY REPORT — NO CANDIDATE SATISFIES ALL CONSTRAINTS', leftCol, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Every evaluated option violates either the budget cap or deadline window. RouteWise strictly refuses', leftCol, y + 13);
      doc.text('to misrepresent a non-compliant carrier as feasible.', leftCol, y + 18);

      y += 30;
    }

    // Candidate Alternatives Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ALL EVALUATED CORRIDOR ALTERNATIVES', margin, y);
    y += 4;

    // Table Header
    doc.setFillColor(226, 232, 240); // slate-200
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text('Option & Carrier', margin + 2, y + 4.2);
    doc.text('Mode', margin + 65, y + 4.2);
    doc.text('Cost (INR)', margin + 92, y + 4.2);
    doc.text('Est Duration', margin + 115, y + 4.2);
    doc.text('Margin', margin + 138, y + 4.2);
    doc.text('Decision Status', margin + 155, y + 4.2);
    y += 7;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    result.alternatives.forEach((alt, idx) => {
      const isAltRecommended = alt.is_recommended;
      const isAltFeasible = alt.constraints.overall_feasible;

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 0.5, contentWidth, 6, 'F');
      }

      doc.setTextColor(15, 23, 42);
      const optNameShort = alt.option.name.length > 34 ? `${alt.option.name.slice(0, 32)}...` : alt.option.name;
      doc.text(optNameShort, margin + 2, y + 3.8);

      doc.text(alt.option.mode.replace('_', ' '), margin + 65, y + 3.8);
      doc.text(`Rs. ${alt.cost.total_cost_inr.toLocaleString()}`, margin + 92, y + 3.8);
      doc.text(`${alt.deadline.estimated_duration_hours}h`, margin + 115, y + 3.8);

      const marginText = alt.deadline.margin_hours >= 0 ? `+${alt.deadline.margin_hours}h` : `${alt.deadline.margin_hours}h`;
      doc.text(marginText, margin + 138, y + 3.8);

      if (isAltRecommended) {
        doc.setTextColor(6, 95, 70);
        doc.text('RECOMMENDED', margin + 155, y + 3.8);
      } else if (isAltFeasible) {
        doc.setTextColor(30, 41, 59);
        doc.text('Feasible', margin + 155, y + 3.8);
      } else {
        doc.setTextColor(190, 18, 60);
        doc.text('Infeasible', margin + 155, y + 3.8);
      }

      y += 6;
    });

    y += 4;

    // Autonomous Decision Rationale Box with full text wrapping (no truncation)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('AUTONOMOUS DECISION RATIONALE & TRADEOFF ANALYSIS', margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const wrappedRationale = doc.splitTextToSize(result.refusal_or_tradeoff_explanation, contentWidth);
    doc.text(wrappedRationale, margin, y);
    y += wrappedRationale.length * 4.2 + 6;

    // Simulation Disclaimer & Audit Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 280, margin + contentWidth, 280);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'DATA SOURCE DISCLOSURE: RouteWise AI deterministic logistics simulation environment. Schedules, rates, and reliability scores are calibrated benchmarks for hackathon decision-agent demonstration. Not verified live carrier telemetry.',
      margin,
      284,
      { maxWidth: contentWidth }
    );
    doc.text('Page 1 of 1 • RouteWise AI Audit Copy', margin + contentWidth - 45, 290);

    doc.save(`RouteWise_Decision_${result.origin}_${result.destination}_${result.run_id || 'run'}.pdf`);
    showSuccess('Logistics Decision PDF report generated and downloaded successfully!');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Journey Alternatives & Tradeoffs
            </h1>
            {result.run_id && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Run ID: {result.run_id}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Multimodal evaluation for corridor: <strong className="text-cyan-300">{result.origin} → {result.destination}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Budget Cap: <strong className="text-emerald-400">₹{result.budget_inr.toLocaleString()}</strong>
          </span>
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Deadline: <strong className="text-cyan-300">{result.deadline_hours} hrs</strong>
          </span>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20 transition-all"
            title="Download formatted decision report"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Interactive Corridor & Evaluated Modes Map */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Corridor Route Map: {result.origin} → {result.destination}
            </h3>
            <p className="text-xs text-slate-400">
              Schematic multimodal transport options evaluated across this corridor
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Esri Basemap</span>
        </div>
        <RouteMap
          activeOrigin={result.origin}
          activeDestination={result.destination}
          segments={result.alternatives.map((alt) => ({
            from: result.origin,
            to: result.destination,
            mode: alt.option.mode,
            isActive: alt.is_recommended,
            optionName: alt.option.name,
            carrier: alt.option.carrier,
            costInr: alt.cost.total_cost_inr,
            durationHours: alt.deadline.estimated_duration_hours,
          }))}
          height="400px"
        />
        <MapLegend />
      </div>

      {/* Visual Charts: Cost vs Duration + Multi-Criteria Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Comparison Bar Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              Total Freight Cost (₹ INR)
            </h3>
            <span className="text-xs text-slate-400">Lower is cheaper • Simulated estimate</span>
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Estimated Transit Duration (Hours)
            </h3>
            <span className="text-xs text-slate-400">Lower is faster • Estimated duration</span>
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
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">Full Comparative Breakdown</h3>
            <p className="text-xs text-slate-400">
              Evaluated strictly against budget (₹{result.budget_inr.toLocaleString()}) and deadline ({result.deadline_hours} hrs)
            </p>
          </div>
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
                <th className="py-3 px-4">Departure & Est Arrival</th>
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
                    <div className="text-[11px] text-slate-400">{alt.option.carrier} (Sample profile)</div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <ModeBadge mode={alt.option.mode} />
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                    <div>{alt.deadline.departure_time}</div>
                    <div className="text-[11px] text-cyan-400">Est Arr: {alt.deadline.estimated_arrival_time}</div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap font-medium text-white">
                    {alt.deadline.estimated_duration_hours} hrs
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-white">₹{alt.cost.total_cost_inr.toLocaleString()}</span>
                    {alt.cost.weight_surcharge_inr > 0 && (
                      <span className="text-[10px] text-slate-400 block">
                        (+₹{alt.cost.weight_surcharge_inr} weight surcharge)
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
                    <span className="text-[9px] text-slate-500 block">illustrative</span>
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
