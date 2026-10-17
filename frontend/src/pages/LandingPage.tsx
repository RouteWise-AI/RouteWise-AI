import React from 'react';
import {
  Compass,
  ArrowRight,
  ShieldAlert,
  Zap,
  TrendingDown,
  Layers,
  Cpu,
  RefreshCw,
  Clock,
  Coins,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

interface LandingPageProps {
  onOpenWorkspace: () => void;
  onOpenAssistant: () => void;
  onOpenInspector: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenWorkspace,
  onOpenAssistant,
  onOpenInspector,
}) => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-cyan-300">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            Amazon Developer Hackathon: Build, Ship, Shape — Alexa+ & AWS Builder
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Smarter Decisions for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Every Journey
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Ordinary navigation apps merely show route geometry and traffic.
            <strong className="text-white font-semibold"> RouteWise AI</strong> acts as an autonomous travel and logistics decision agent: comparing multimodal carriers, enforcing hard budget and deadline constraints, and dynamically replanning when disruptions strike.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onOpenWorkspace}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              Launch Logistics Command Center
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAssistant}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              Ask AI Logistics Assistant
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-6 text-xs text-slate-400 border-t border-slate-800/80 max-w-xl mx-auto">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Real MCP Protocol Client
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Amazon Bedrock Converse API
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Deterministic Mock Fallback
            </div>
          </div>
        </div>
      </section>

      {/* The Problem We Solve */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 sm:p-10">
        <div className="max-w-3xl mx-auto space-y-4 text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Why Ordinary Navigation Fails in Critical Logistics
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Navigation tools map the quickest path on a road, but logistics decision-makers have multidimensional requirements:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Strict Budget & Weight Limits</h3>
            <p className="text-sm text-slate-400">
              Air priority might be 2 hours faster, but if it blows past the ₹2,000 budget, it’s completely infeasible. RouteWise treats budget as an inviolable hard constraint.
            </p>
          </div>

          <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Timezone-Aware Deadlines</h3>
            <p className="text-sm text-slate-400">
              Arrival buffers matter. An option arriving 15 minutes before the deadline has a high failure risk. RouteWise computes arrival buffers and flags tight margins.
            </p>
          </div>

          <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Disruptions & Auto-Replanning</h3>
            <p className="text-sm text-slate-400">
              When a freight train faces a 2-hour rail delay, ordinary maps still route to the train station. RouteWise evaluates the disruption, detects deadline violation, and pivots to highway express.
            </p>
          </div>
        </div>
      </section>

      {/* How RouteWise AI Works (4 Steps) */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Decision Architecture</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">How RouteWise AI Reaches a Grounded Decision</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono font-bold text-blue-400">STEP 01</div>
            <h4 className="text-base font-bold text-white">Constraint Ingestion</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Captures origin, destination, cargo weight, handling requirements, budget in INR, and deadline hours.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono font-bold text-indigo-400">STEP 02</div>
            <h4 className="text-base font-bold text-white">MCP Tool Execution</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dispatches protocol calls over Streamable HTTP to 7 dedicated MCP tools for candidate ranking, pricing, and feasibility checks.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono font-bold text-cyan-400">STEP 03</div>
            <h4 className="text-base font-bold text-white">Transparent Reasoning</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Amazon Bedrock Converse API synthesizes grounded tradeoff explanations without hallucinating prices or unachievable routes.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono font-bold text-emerald-400">STEP 04</div>
            <h4 className="text-base font-bold text-white">Dynamic Replanning</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Simulates real-world delays, evaluates impact on arrival windows, and computes instant before-and-after variance metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Primary Demonstration Corridor Banner */}
      <section className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 rounded-2xl p-8 sm:p-10 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Primary Hackathon Corridor
            </span>
            <h3 className="text-2xl font-bold text-white">Vijayawada to Visakhapatnam (~350 km Coastal Highway & Rail)</h3>
            <p className="text-sm text-slate-300 max-w-2xl">
              Preset with a 6-hour delivery deadline, ₹2,000 maximum budget, and high reliability focus. Test how the system selects Express Rail, simulates a 2-hour track bottleneck, and instantly replans to Coastal Highway Express.
            </p>
          </div>

          <button
            onClick={onOpenWorkspace}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all shadow-md shadow-cyan-500/20"
          >
            Run Demo Corridor
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Protocol Architecture Inspector CTA */}
      <section className="border border-slate-800 rounded-xl p-6 bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Live Model Context Protocol (MCP) Inspector</h4>
            <p className="text-xs text-slate-400">
              Inspect raw Streamable HTTP MCP JSON-RPC requests, validated tool arguments, and execution durations in real-time.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenInspector}
          className="text-xs font-medium px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all cursor-pointer"
        >
          Open MCP Inspector
        </button>
      </section>
    </div>
  );
};

