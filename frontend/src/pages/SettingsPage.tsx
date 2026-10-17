import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  RotateCcw,
  KeyRound,
  Coins,
  Cpu,
  FileCode,
  Lock,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { SystemHealth } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  health: SystemHealth | null;
  onResetComplete: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ health, onResetComplete }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetDemo();
      setResetMessage(res.message || 'Demo state reset successfully');
      onResetComplete();
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err: any) {
      alert(`Error resetting: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-cyan-400" />
          Settings & Project Configuration
        </h1>
        <p className="text-sm text-slate-400">
          Environment runtime parameters, AWS Bedrock configuration, and security controls.
        </p>
      </div>

      {/* Provider & Runtime Information */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Active AI Provider & Mode
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Active AI Mode</span>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              {health?.ai_provider_mode === 'bedrock' ? 'Amazon Bedrock Mode' : 'Deterministic Mock Mode'}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {health?.ai_provider_mode === 'bedrock'
                ? 'Calls the Bedrock Converse API using server-side AWS credentials and model-driven tool selection.'
                : 'Deterministic offline mode utilizing the real MCP server without requiring AWS credentials or cloud spend.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Target AWS Configuration</span>
            <div className="text-xs space-y-1 font-mono text-slate-300">
              <div>Region: <strong className="text-cyan-300">{health?.aws_region}</strong></div>
              <div>Model: <strong className="text-purple-300">{health?.bedrock_model_id}</strong></div>
            </div>
            <p className="text-[11px] text-slate-400">
              Configured via <code className="text-slate-300">.env</code> in backend. AWS credentials are never exposed to the browser.
            </p>
          </div>
        </div>
      </div>

      {/* Least Privilege IAM Guidance */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-indigo-400" />
          Least-Privilege AWS IAM Policy
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          When activating <strong className="text-cyan-300">Amazon Bedrock Mode</strong>, attach this least-privilege IAM policy to your AWS profile or role:
        </p>

        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-200 overflow-x-auto">
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RouteWiseBedrockConversePolicy",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:Converse"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/*"
    }
  ]
}`}
        </pre>
      </div>

      {/* Security & Cost Safeguards */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          Cost Safety & Safeguards
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
            <strong className="text-white block font-semibold">Bounded Agent Turns</strong>
            <p className="text-slate-400">
              The agent loop is strictly capped at a maximum of 5 tool turns per request, preventing infinite loops or unbounded token costs.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1">
            <strong className="text-white block font-semibold">Zero Mandatory Cloud Billing</strong>
            <p className="text-slate-400">
              Mock mode works 100% locally with zero cloud spend. Developers can test the full MCP lifecycle without touching AWS credits.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Reset */}
      <div className="border border-slate-800 rounded-2xl p-6 bg-slate-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white">Reset Demo Scenario State</h4>
          <p className="text-xs text-slate-400">
            Clears conversational context memory and resets the MCP activity inspector log.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          Reset Demo State
        </button>
      </div>

      {resetMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {resetMessage}
        </div>
      )}
    </div>
  );
};
