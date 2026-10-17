import React, { useState } from 'react';
import {
  Compass,
  Sliders,
  Play,
  RotateCcw,
  AlertTriangle,
  Clock,
  Coins,
  Weight,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Flame,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import type {
  ComparisonResult,
  EvaluatedOption,
  PriorityGoal,
  ShipmentType,
  TransportMode,
} from '../types';
import { ModeBadge, DeadlineBadge } from '../components/Badge';
import { api } from '../services/api';

interface WorkspacePageProps {
  onReplanResult: (result: any) => void;
  onNavigateToReplan: () => void;
  onNavigateToComparison: () => void;
  initialResult?: ComparisonResult | null;
  setGlobalComparisonResult: (res: ComparisonResult) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onReplanResult,
  onNavigateToReplan,
  onNavigateToComparison,
  initialResult,
  setGlobalComparisonResult,
}) => {
  // Input form state
  const [origin, setOrigin] = useState('Vijayawada');
  const [destination, setDestination] = useState('Visakhapatnam');
  const [budgetInr, setBudgetInr] = useState(2000);
  const [deadlineHours, setDeadlineHours] = useState(6.0);
  const [weightKg, setWeightKg] = useState(5.0);
  const [shipmentType, setShipmentType] = useState<ShipmentType>('STANDARD');
  const [priority, setPriority] = useState<PriorityGoal>('DEADLINE_CRITICAL');
  const [declaredValue, setDeclaredValue] = useState<number | undefined>(undefined);

  // Loading & results state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(initialResult || null);

  // Disruption simulation quick-controls
  const [simDelayHours, setSimDelayHours] = useState(2.0);
  const [isSimulatingReplan, setIsSimulatingReplan] = useState(false);

  // Preset loaders
  const loadPrimaryDemo = () => {
    setOrigin('Vijayawada');
    setDestination('Visakhapatnam');
    setBudgetInr(2000);
    setDeadlineHours(6.0);
    setWeightKg(5.0);
    setShipmentType('STANDARD');
    setPriority('DEADLINE_CRITICAL');
    setError(null);
  };

  const loadHonestRefusalDemo = () => {
    setOrigin('Vijayawada');
    setDestination('Visakhapatnam');
    setBudgetInr(1500);
    setDeadlineHours(3.0);
    setWeightKg(5.0);
    setShipmentType('STANDARD');
    setPriority('BALANCED');
    setError(null);
  };

  const loadInterstateDemo = () => {
    setOrigin('Hyderabad');
    setDestination('Bengaluru');
    setBudgetInr(3000);
    setDeadlineHours(9.0);
    setWeightKg(8.0);
    setShipmentType('STANDARD');
    setPriority('BALANCED');
    setError(null);
  };

  const handleCompare = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.compareRoutes({
        origin,
        destination,
        budget_inr: budgetInr,
        deadline_hours: deadlineHours,
        weight_kg: weightKg,
        shipment_type: shipmentType,
        priority: priority,
      });
      setResult(data);
      setGlobalComparisonResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to compare options via MCP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReplan = async () => {
    if (!result?.recommended_option) return;
    setIsSimulatingReplan(true);
    try {
      const replanData = await api.replanJourney({
        original_option_id: result.recommended_option.option.id,
        origin,
        destination,
        delay_hours: simDelayHours,
        budget_inr: budgetInr,
        deadline_hours: deadlineHours,
        weight_kg: weightKg,
        shipment_type: shipmentType,
        priority: priority,
        disruption_reason: `Simulated track/highway congestion on ${result.recommended_option.option.name}`,
      });
      onReplanResult(replanData);
      onNavigateToReplan();
    } catch (err: any) {
      alert(`Replan error: ${err.message}`);
    } finally {
      setIsSimulatingReplan(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header and Preset Scenarios */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Logistics Command Center
          </h1>
          <p className="text-sm text-slate-400">
            Define multimodal constraints and execute real MCP protocol decision algorithms.
          </p>
        </div>

        {/* Quick Demo Scenario Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadPrimaryDemo}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 text-cyan-300 border border-blue-500/30 hover:bg-blue-600/30 transition-all cursor-pointer font-medium"
            title="Vijayawada -> Visakhapatnam (6h, ₹2,000, Reliable)"
          >
            ⭐ Primary Hackathon Demo
          </button>
          <button
            onClick={loadHonestRefusalDemo}
            className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer font-medium"
            title="3h deadline, ₹1,500 budget (Stress test honest refusal)"
          >
            ⚠️ Infeasible Stress Test
          </button>
          <button
            onClick={loadInterstateDemo}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer font-medium"
            title="Hyderabad -> Bengaluru corridor"
          >
            🚚 Hyderabad → Bengaluru
          </button>
        </div>
      </div>

      {/* Main Grid: Input Parameters and Decision Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Constraints Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Journey Constraints
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Pydantic & MCP Verified</span>
          </div>

          <div className="space-y-4">
            {/* Origin & Destination */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Origin City</label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Vijayawada">Vijayawada (BZA)</option>
                  <option value="Hyderabad">Hyderabad (HYD)</option>
                  <option value="Chennai">Chennai (MAA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination City</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Visakhapatnam">Visakhapatnam (VTZ)</option>
                  <option value="Bengaluru">Bengaluru (BLR)</option>
                  <option value="Vijayawada">Vijayawada (BZA)</option>
                </select>
              </div>
            </div>

            {/* Budget & Deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> Max Budget (₹)
                </label>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={budgetInr}
                  onChange={(e) => setBudgetInr(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> Deadline Window (hrs)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Weight & Shipment Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-blue-400" /> Weight (kg)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Handling Type</label>
                <select
                  value={shipmentType}
                  onChange={(e) => setShipmentType(e.target.value as ShipmentType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="STANDARD">Standard Freight</option>
                  <option value="EXPRESS">Express Priority</option>
                  <option value="FRAGILE">Fragile (+₹180)</option>
                  <option value="PERISHABLE">Perishable Cold (+₹260)</option>
                  <option value="DOCUMENT">Secure Document</option>
                </select>
              </div>
            </div>

            {/* Optimization Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Decision Priority</label>
              <div className="grid grid-cols-2 gap-2">
                {(['CHEAPEST', 'FASTEST', 'BALANCED', 'DEADLINE_CRITICAL'] as PriorityGoal[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      priority === p
                        ? 'bg-blue-600/20 border-blue-500 text-cyan-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p === 'DEADLINE_CRITICAL' && '🎯 Deadline Critical'}
                    {p === 'CHEAPEST' && '💰 Lowest Cost'}
                    {p === 'FASTEST' && '⚡ Highest Speed'}
                    {p === 'BALANCED' && '⚖️ Balanced Multi-Criteria'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleCompare}
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Invoking MCP compare_routes...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Compare Options via MCP
              </>
            )}
          </button>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Execution Output & Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!result ? (
            <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-semibold text-white">No Active Comparison Computed</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Configure your shipment requirements on the left, or click <strong className="text-cyan-300">Primary Hackathon Demo</strong> above to trigger a real MCP protocol query.
              </p>
              <button
                onClick={handleCompare}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer"
              >
                Execute Default Corridor
              </button>
            </div>
          ) : (
            <>
              {/* Executive Recommendation Banner */}
              {result.has_feasible_solution && result.recommended_option ? (
                <div className="bg-gradient-to-br from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/40 rounded-2xl p-6 space-y-5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Top Grounded Recommendation
                      </span>
                      <ModeBadge mode={result.recommended_option.option.mode} />
                    </div>
                    <span className="text-xs text-slate-400">
                      Score: <strong className="text-cyan-300">{result.recommended_option.score.toFixed(3)}</strong>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      {result.recommended_option.option.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Carrier: <span className="text-slate-200 font-medium">{result.recommended_option.option.carrier}</span>
                    </p>
                  </div>

                  {/* Core Decision Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Total Freight Cost</span>
                      <span className="text-lg font-bold text-emerald-400">
                        ₹{result.recommended_option.cost.total_cost_inr.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block">Transit Duration</span>
                      <span className="text-lg font-bold text-white">
                        {result.recommended_option.deadline.estimated_duration_hours} hrs
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block">Deadline Status</span>
                      <div className="mt-1">
                        <DeadlineBadge
                          status={result.recommended_option.deadline.status}
                          marginHours={result.recommended_option.deadline.margin_hours}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block">Reliability</span>
                      <span className="text-lg font-bold text-cyan-300">
                        {Math.round(result.recommended_option.option.reliability_score * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Rationale Quote */}
                  <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-xs text-slate-200 leading-relaxed">
                    <strong className="text-cyan-300">Decision Rationale: </strong>
                    {result.refusal_or_tradeoff_explanation}
                  </div>

                  {/* Quick Disruption Trigger Box */}
                  <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Flame className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-white">Simulate Bottleneck / Delay</div>
                        <div className="text-[11px] text-slate-400">Inject unexpected transit delay to trigger replanner</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={simDelayHours}
                        onChange={(e) => setSimDelayHours(parseFloat(e.target.value))}
                        className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                      >
                        <option value={1.5}>+1.5 Hours Delay</option>
                        <option value={2.0}>+2.0 Hours Delay</option>
                        <option value={3.0}>+3.0 Hours Delay</option>
                      </select>

                      <button
                        onClick={handleQuickReplan}
                        disabled={isSimulatingReplan}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all"
                      >
                        {isSimulatingReplan ? 'Replanning...' : 'Trigger Replan'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Honest Refusal Card */
                <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5" />
                    Honest Infeasibility Report
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    No Sample Corridor Options Meet All Hard Constraints
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-rose-950/40 p-4 rounded-xl border border-rose-500/20">
                    {result.refusal_or_tradeoff_explanation}
                  </p>
                  <div className="text-xs text-slate-400">
                    RouteWise AI strictly respects hard constraints and refuses to recommend a budget-busting or deadline-missing plan as "optimal".
                  </div>
                </div>
              )}

              {/* All Alternatives Summary List */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white">
                    Evaluated Alternatives ({result.alternatives.length} Options)
                  </h4>
                  <button
                    onClick={onNavigateToComparison}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    View Side-by-Side Breakdown <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {result.alternatives.map((alt) => (
                    <div
                      key={alt.option.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        alt.is_recommended
                          ? 'bg-blue-950/20 border-blue-500/40'
                          : alt.constraints.overall_feasible
                          ? 'bg-slate-950/60 border-slate-800'
                          : 'bg-rose-950/10 border-rose-500/20 opacity-80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{alt.option.name}</span>
                          <ModeBadge mode={alt.option.mode} />
                          {alt.is_recommended && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {alt.tradeoff_summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div>
                          <div className="text-xs font-bold text-white">
                            ₹{alt.cost.total_cost_inr.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {alt.deadline.estimated_duration_hours} hrs
                          </div>
                        </div>
                        <DeadlineBadge
                          status={alt.deadline.status}
                          marginHours={alt.deadline.margin_hours}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
