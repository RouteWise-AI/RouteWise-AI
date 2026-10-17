import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  removing?: boolean;
}

interface ToastContextValue {
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  showWarning: (msg: string) => void;
  showInfo: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
  showInfo: () => {},
});

export const useToast = () => useContext(ToastContext);

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'bg-emerald-950', border: 'border-emerald-500/50', text: 'text-emerald-300', icon: '✓' },
  error: { bg: 'bg-rose-950', border: 'border-rose-500/50', text: 'text-rose-300', icon: '✕' },
  warning: { bg: 'bg-amber-950', border: 'border-amber-500/50', text: 'text-amber-300', icon: '⚠' },
  info: { bg: 'bg-blue-950', border: 'border-blue-500/50', text: 'text-blue-300', icon: 'ℹ' },
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const c = COLORS[toast.type];
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl max-w-sm w-full transition-all duration-300 ${c.bg} ${c.border} ${toast.removing ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}
      style={{ transform: toast.removing ? 'translateX(32px)' : 'translateX(0)', opacity: toast.removing ? 0 : 1 }}
    >
      <span className={`text-lg font-bold leading-none mt-0.5 ${c.text}`}>{c.icon}</span>
      <p className="flex-1 text-sm text-white leading-snug">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-slate-500 hover:text-white text-xs ml-1 mt-0.5 cursor-pointer">✕</button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  const value: ToastContextValue = {
    showSuccess: (msg) => addToast(msg, 'success'),
    showError: (msg) => addToast(msg, 'error'),
    showWarning: (msg) => addToast(msg, 'warning'),
    showInfo: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
