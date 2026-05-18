import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type Variant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  variant: Variant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const styles: Record<Variant, { bg: string; border: string; icon: string; Icon: React.ElementType; text: string }> = {
  success: { bg: 'bg-[#A7F3D0]/40', border: 'border-[#10B981]', icon: 'text-[#10B981]', Icon: CheckCircle2, text: 'text-[#065F46]' },
  error: { bg: 'bg-[#FEE2E2]', border: 'border-[#EF4444]', icon: 'text-[#EF4444]', Icon: AlertCircle, text: 'text-[#B91C1C]' },
  warning: { bg: 'bg-[#FEF3C7]', border: 'border-[#F59E0B]', icon: 'text-[#F59E0B]', Icon: AlertTriangle, text: 'text-[#92400E]' },
  info: { bg: 'bg-[#CAF0F8]/60', border: 'border-[#0077B6]', icon: 'text-[#0077B6]', Icon: Info, text: 'text-[#03045E]' }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setItems((arr) => [...arr, { ...t, id }]);
    setTimeout(() => remove(id), 5000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {items.map((t) => {
          const s = styles[t.variant];
          const Icon = s.Icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 ${s.bg} border ${s.border} rounded-2xl shadow-lg backdrop-blur-sm p-4 animate-in slide-in-from-right duration-300`}
            >
              <Icon size={20} className={`${s.icon} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${s.text}`}>{t.title}</p>
                {t.description && <p className={`text-sm mt-0.5 ${s.text} opacity-80`}>{t.description}</p>}
              </div>
              <button
                onClick={() => remove(t.id)}
                className={`${s.icon} hover:opacity-70 shrink-0`}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
