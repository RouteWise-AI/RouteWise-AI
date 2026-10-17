import React from 'react';
import {
  Compass,
  Sliders,
  GitCompare,
  MessageSquareText,
  AlertOctagon,
  Cpu,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { SystemHealth } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: SystemHealth | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, health }) => {
  const isHealthy = health?.status === 'healthy';
  const mcpHealthy = health?.mcp_server?.status === 'healthy';
  const isMock = health?.ai_provider_mode === 'mock';

  const navItems = [
    { id: 'landing', label: 'Overview', icon: Compass },
    { id: 'workspace', label: 'Command Center', icon: Sliders },
    { id: 'comparison', label: 'Compare Options', icon: GitCompare },
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquareText },
    { id: 'replan', label: 'Disruption & Replan', icon: AlertOctagon },
    { id: 'inspector', label: 'MCP Inspector', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setActiveTab('landing')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-sans">
                  RouteWise <span className="text-cyan-400">AI</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Hackathon Edition
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Smarter Decisions for Every Journey
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* System Status Indicators */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                mcpHealthy
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
              title="MCP Server over Streamable HTTP status"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${mcpHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden lg:inline">MCP:</span> {mcpHealthy ? 'Connected' : 'Offline'}
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                isMock
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                  : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
              }`}
              title="Current AI Provider Mode"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isMock ? 'Mock Mode' : 'AWS Bedrock'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex overflow-x-auto py-2 px-4 gap-2 border-t border-slate-800/80 bg-slate-950/60">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
                isActive ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
