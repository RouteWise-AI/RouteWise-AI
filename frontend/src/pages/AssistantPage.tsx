import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquareText,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Cpu,
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
} from 'lucide-react';
import type { ChatMessageItem } from '../types';
import { ChatMessageSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api } from '../services/api';

const SAMPLE_PROMPTS = [
  "Plan a delivery from Vijayawada to Visakhapatnam within six hours, with a maximum budget of ₹2,000. Prefer a reliable option.",
  "There is a delay of 2 hours on the train. Replan the journey.",
  "Plan a delivery from Vijayawada to Visakhapatnam within 3 hours with ₹1,500 budget (test honest refusal).",
  "Plan a shipment from Hyderabad to Bengaluru within 10 hours for a fragile parcel under ₹3,000.",
  "Plan an express shipment from Mumbai to Pune within 3 hours under ₹1,000 budget.",
  "Plan a northern corridor transport from Delhi to Chandigarh within 4 hours for ₹1,200.",
];

export const AssistantPage: React.FC = () => {
  const { showSuccess, showInfo } = useToast();
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        "Hello! I am **RouteWise AI**, your multimodal travel and logistics decision agent. I help you evaluate carriers across 6 major Indian corridors, enforce strict delivery deadlines and budgets, and dynamically replan when disruptions happen.\n\nHow can I help plan or adapt your journey today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const historyForApi = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendChatMessage(textToSend, historyForApi);

      const botMsg: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tools_executed: res.tools_executed,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error consulting logistics decision engine: ${err.message || 'Network error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: "Conversation history cleared. Ready for your next journey query!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showInfo('Conversation history reset.');
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Message copied to clipboard!');
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <MessageSquareText className="w-7 h-7 text-cyan-400" />
            AI Logistics Decision Assistant
          </h1>
          <p className="text-sm text-slate-400">
            Natural language interface orchestrating genuine Streamable HTTP MCP tools with zero-hallucination ground truth.
          </p>
        </div>

        <button
          onClick={handleResetChat}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Chat
        </button>
      </div>

      {/* Suggested Scenario Prompts */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Quick Test Scenarios (Click to Run):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-left text-xs p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/60 text-slate-300 hover:text-cyan-200 transition-all cursor-pointer flex items-start gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 min-h-[460px] max-h-[580px] overflow-y-auto space-y-6 shadow-inner">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Tools executed badge */}
                {m.tools_executed && m.tools_executed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.tools_executed.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-cyan-300"
                      >
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        MCP Tool: {t.tool}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap relative group ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-[#0f172a] border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  {m.content}
                  {!isUser && (
                    <button
                      onClick={() => handleCopyMessage(m.content)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity cursor-pointer"
                      title="Copy response"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 px-1">{m.timestamp}</span>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="space-y-3">
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-cyan-300 font-mono text-[11px]">
                <Cpu className="w-3.5 h-3.5 animate-pulse" />
                <span>Invoking MCP decision tools over Streamable HTTP...</span>
              </div>
            </div>
            <ChatMessageSkeleton />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask e.g.: 'Plan Vijayawada to Visakhapatnam within 6 hrs, budget ₹2,000'..."
          disabled={isSending}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
};
