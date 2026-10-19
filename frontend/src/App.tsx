import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ToastProvider } from './components/Toast';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ComparisonPage } from './pages/ComparisonPage';
import { AssistantPage } from './pages/AssistantPage';
import { ReplanPage } from './pages/ReplanPage';
import { InspectorPage } from './pages/InspectorPage';
import { SettingsPage } from './pages/SettingsPage';
import type { ComparisonResult, ReplanningResult, SystemHealth } from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) return tabParam;
    } catch {}
    return localStorage.getItem('routewise_tab') || 'workspace';
  });
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const [globalComparison, setGlobalComparison] = useState<ComparisonResult | null>(() => {
    try {
      const saved = localStorage.getItem('routewise_comparison');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [globalReplan, setGlobalReplan] = useState<ReplanningResult | null>(() => {
    try {
      const saved = localStorage.getItem('routewise_replan');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persist state to local storage
  const handleSetComparison = (res: ComparisonResult | null) => {
    setGlobalComparison(res);
    if (res) {
      localStorage.setItem('routewise_comparison', JSON.stringify(res));
    } else {
      localStorage.removeItem('routewise_comparison');
    }
  };

  const handleSetReplan = (res: ReplanningResult | null) => {
    setGlobalReplan(res);
    if (res) {
      localStorage.setItem('routewise_replan', JSON.stringify(res));
    } else {
      localStorage.removeItem('routewise_replan');
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('routewise_tab', tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      // Offline fallback state
      setHealth({
        status: 'unreachable',
        app: 'RouteWise AI',
        version: '1.0.0',
        tagline: 'Smarter Decisions for Every Journey.',
        ai_provider_mode: 'mock',
        aws_region: 'us-east-1',
        bedrock_model_id: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
        mcp_server: {
          configured_url: 'http://127.0.0.1:8000/mcp',
          status: 'offline',
          details: null,
        },
      });
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">
        {/* Top Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          health={health}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {activeTab === 'landing' && (
            <LandingPage
              onOpenWorkspace={() => handleTabChange('workspace')}
              onOpenAssistant={() => handleTabChange('assistant')}
              onOpenInspector={() => handleTabChange('inspector')}
            />
          )}

          {activeTab === 'workspace' && (
            <WorkspacePage
              onReplanResult={(res) => handleSetReplan(res)}
              onNavigateToReplan={() => handleTabChange('replan')}
              onNavigateToComparison={() => handleTabChange('comparison')}
              initialResult={globalComparison}
              setGlobalComparisonResult={(res) => handleSetComparison(res)}
            />
          )}

          {activeTab === 'comparison' && (
            <ComparisonPage
              result={globalComparison}
              onNavigateToWorkspace={() => handleTabChange('workspace')}
            />
          )}

          {activeTab === 'assistant' && <AssistantPage />}

          {activeTab === 'replan' && (
            <ReplanPage
              replanResult={globalReplan}
              setReplanResult={(res) => handleSetReplan(res)}
            />
          )}

          {activeTab === 'inspector' && (
            <InspectorPage
              health={health}
              onRefreshHealth={fetchHealth}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              health={health}
              onResetComplete={() => {
                handleSetComparison(null);
                handleSetReplan(null);
                fetchHealth();
              }}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              <strong className="text-white">RouteWise AI</strong> — Smarter Decisions for Every Journey.
              <span className="mx-2 text-slate-600">|</span>
              Amazon Developer Hackathon: Build, Ship, Shape
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Official Python MCP SDK 2.x</span>
              <span>•</span>
              <span>Amazon Bedrock Converse API</span>
              <span>•</span>
              <span>Deterministic Logistics Engine</span>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}

export default App;
