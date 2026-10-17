import React, { useState } from 'react';
import {
  AlertOctagon,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Coins,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
} from 'lucide-react';
import type { ReplanningResult } from '../types';
import { RouteMap, MapLegend } from '../components/RouteMap';
import { useToast } from '../components/Toast';
import { api } from '../services/api';

interface ReplanPageProps {
  replanResult: ReplanningResult | null;
  setReplanResult: (res: ReplanningResult) => void;
}

export const ReplanPage: React.FC<ReplanPageProps> = ({
  replanResult,
  setReplanResult,
}) => {
  const { showSuccess, showError, showWarning } = useToast();

  const [origin, setOrigin] = useState('Vijayawada');
  const [destination, setDestination] = useState('Visakhapatnam');
  const [delayHours, setDelayHours] = useState(2.0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [costIncreasePct, setCostIncreasePct] = useState(0.0);
  const [reason, setReason] = useState('Signal failure & rail track bottleneck near Rajahmundry');
  const [isReplanning, setIsReplanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecuteReplan = async () => {
    setIsReplanning(true);
    setError(null);
    try {
      const optionId = origin === 'Vijayawada' ? 'BZA-VTZ-RAIL-01' : origin === 'Hyderabad' ? 'HYD-BLR-RAIL-01' : 'BZA-VTZ-RAIL-01';
      const data = await api.replanJourney({
        original_option_id: optionId,
        origin,
        destination,
        delay_hours: delayHours,
        budget_inr: 2500.0,
        deadline_hours: 6.0,
        weight_kg: 5.0,
        shipment_type: 'STANDARD',
        priority: 'BALANCED',
        is_cancelled: isCancelled,
        cost_increase_pct: costIncreasePct,
        disruption_reason: reason,
      });
      setReplanResult(data);
      if (data.revised_recommended_option) {
        showSuccess(`Autonomous Replan Succeeded! Rerouted to: ${data.revised_recommended_option.option.name}`);
      } else {
        showWarning('Disruption caused plan infeasibility without viable alternative within constraints.');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to execute replanning';
      setError(msg);
      showError(msg);
    } finally {
      setIsReplanning(false);
    }
  };

  const mapSegments = [
    { from: origin, to: destination, mode: 'RAIL' as const, isDisrupted: true, isActive: true },
    ...(replanResult?.revised_recommended_option
      ? [{ from: origin, to: destination, mode: replanResult.revised_recommended_option.option.mode, isDisrupted: false, isActive: true }]
      : []),
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <AlertOctagon className="w-7 h-7 text-amber-400" />
            Disruption Simulator & Resilient Replanning
          </h1>
          <p className="text-sm text-slate-400">
            Real-time before-and-after decision resilience for the {origin} → {destination} corridor.
          </p>
        </div>

        <button
          onClick={handleExecuteReplan}
          disabled={isReplanning}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-amber-500/20"
        >
          {isReplanning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Running MCP replan_journey...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Simulate & Replan
            </>
          )}
        </button>
      </div>

      {/* Disruption Parameters Panel + Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Disruption Scenario Controls
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">replan_journey MCP Tool</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Corridor Origin</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Vijayawada">Vijayawada (BZA)</option>
                <option value="Hyderabad">Hyderabad (HYD)</option>
                <option value="Chennai">Chennai (MAA)</option>
                <option value="Mumbai">Mumbai (BOM)</option>
                <option value="Delhi">Delhi (DEL)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Corridor Destination</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Visakhapatnam">Visakhapatnam (VTZ)</option>
                <option value="Bengaluru">Bengaluru (BLR)</option>
                <option value="Vijayawada">Vijayawada (BZA)</option>
                <option value="Pune">Pune (PNQ)</option>
                <option value="Chandigarh">Chandigarh (IXC)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 text-xs pt-1">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Simulated Delay Duration: <strong className="text-cyan-300">+{delayHours} hours</strong>
              </label>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={delayHours}
                onChange={(e) => setDelayHours(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>+0.5h (Minor)</span>
                <span>+2.0h (Critical)</span>
                <span>+5.0h (Severe)</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Disruption Incident Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={isCancelled}
                  onChange={(e) => setIsCancelled(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-400 focus:ring-0 w-4 h-4"
                />
                Option Cancellation (Force Grounding / Total Outage)
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Live Disruption Map */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Disruption Corridor Map
            </span>
            <span className="text-[10px] text-rose-400 font-mono font-bold animate-pulse">● INCIDENT ACTIVE</span>
          </div>
          <RouteMap
            activeOrigin={origin}
            activeDestination={destination}
            segments={mapSegments}
            height="230px"
          />
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Disrupted Track (Red)</span>
            </div>
            {replanResult?.revised_recommended_option && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-cyan-400" />
                <span>Rerouted Mode</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Before, Disrupted, and After 3-Column Experience */}
      {replanResult && (
        <div className="space-y-6">
          {/* Variance Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Cost Variance vs Original</span>
              <span className={`text-base font-bold flex items-center gap-1 ${
                replanResult.cost_delta_inr <= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {replanResult.cost_delta_inr <= 0 ? (
                  <ArrowDownRight className="w-4 h-4" />
                ) : (
                  <ArrowUpRight className="w-4 h-4" />
                )}
                ₹{Math.abs(replanResult.cost_delta_inr).toLocaleString()}
                <span className="text-[10px] font-normal text-slate-400">
                  ({replanResult.cost_delta_inr <= 0 ? 'Saved' : 'Additional'})
                </span>
              </span>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Time vs Disrupted Train</span>
              <span className="text-base font-bold text-cyan-400 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" />
                {(replanResult.disrupted_duration_hours - (replanResult.revised_recommended_option?.deadline.estimated_duration_hours || 0)).toFixed(1)} hrs saved
              </span>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Original Feasibility</span>
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1 mt-1">
                <XCircle className="w-4 h-4" /> Deadline Violated
              </span>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Revised Feasibility</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-4 h-4" /> Restored to On-Time
              </span>
            </div>
          </div>

          {/* 3-Column Progression Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Original Plan */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  STAGE 1: Baseline Selection
                </span>
                <span className="text-xs text-emerald-400 font-semibold">Feasible</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Andhra Express Freight Rail</h4>
                <p className="text-xs text-slate-400">Vande Cargo (Option ID: {replanResult.original_option_id})</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Base Transit:</span>
                  <span className="text-white font-medium">{replanResult.original_duration_hours} hrs</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Scheduled Arrival:</span>
                  <span className="text-slate-200">{replanResult.original_arrival}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Base Cost:</span>
                  <span className="text-emerald-400 font-bold">₹{replanResult.original_cost_inr.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Disrupted Incident */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  STAGE 2: Disruption Incident
                </span>
                <span className="text-xs text-rose-400 font-semibold">Infeasible</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Bottleneck Injected</h4>
                <p className="text-xs text-slate-300">+{replanResult.disruption_applied.delay_hours}h delay applied to Rail</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-rose-500/10">
                  <span className="text-slate-400">Revised Duration:</span>
                  <span className="text-rose-400 font-bold">{replanResult.disrupted_duration_hours} hrs</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-500/10">
                  <span className="text-slate-400">Missed Arrival:</span>
                  <span className="text-slate-300">{replanResult.disrupted_arrival}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Deadline Status:</span>
                  <span className="text-rose-400 font-semibold">Late by 12 mins (misses window)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Revised Autonomous Plan */}
            <div className="bg-cyan-950/20 border border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-lg shadow-cyan-500/5">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  STAGE 3: Autonomous Replan
                </span>
                <span className="text-xs text-emerald-400 font-semibold">Restored</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  {replanResult.revised_recommended_option?.option.name || 'Emergency Plan'}
                </h4>
                <p className="text-xs text-cyan-400">
                  Carrier: {replanResult.revised_recommended_option?.option.carrier}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-cyan-500/10">
                  <span className="text-slate-400">New Transit:</span>
                  <span className="text-white font-bold">
                    {replanResult.revised_recommended_option?.deadline.estimated_duration_hours} hrs
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-cyan-500/10">
                  <span className="text-slate-400">Guaranteed Arrival:</span>
                  <span className="text-cyan-300">
                    {replanResult.revised_recommended_option?.deadline.estimated_arrival_time}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">New Cost:</span>
                  <span className="text-emerald-400 font-bold">
                    ₹{replanResult.revised_recommended_option?.cost.total_cost_inr.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Replanning Explanation Box */}
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-2xl p-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Replanning Rationale & Autonomous Verification
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {replanResult.decision_explanation}
            </p>

            {replanResult.remaining_risks && replanResult.remaining_risks.length > 0 && (
              <div className="pt-3 border-t border-blue-500/20 space-y-1">
                <span className="text-[11px] font-semibold text-amber-400">Identified Residual Risks:</span>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                  {replanResult.remaining_risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
