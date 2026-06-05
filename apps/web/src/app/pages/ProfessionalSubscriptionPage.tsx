import React, { useState } from 'react';
import { Sparkles, Zap, Crown, CheckCircle2, Check } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useApi } from '../lib/hooks';
import { api } from '../lib/api';
import { toast } from 'sonner';

const font: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// Planos do profissional autônomo (ids batem com ProfessionalPlan no backend).
type ProPlan = 'free' | 'basico' | 'avancado';

const PLANS: {
  id: ProPlan;
  name: string;
  price: string;
  icon: React.ElementType;
  iconColors: string;
  popular?: boolean;
  features: string[];
}[] = [
  {
    id: 'free', name: 'Gratuito', price: 'Gratuito', icon: Sparkles,
    iconColors: 'bg-[#E0F2FE] text-[#0077B6]',
    features: ['Agenda online', 'Agendamentos ilimitados', 'Perfil público'],
  },
  {
    id: 'basico', name: 'Básico', price: 'R$ 39/mês', icon: Zap,
    iconColors: 'bg-[#A7F3D0] text-[#10B981]', popular: true,
    features: ['Tudo do Gratuito', 'Notificações por e-mail', 'Lembretes automáticos'],
  },
  {
    id: 'avancado', name: 'Avançado', price: 'R$ 69/mês', icon: Crown,
    iconColors: 'bg-[#FEF3C7] text-[#F59E0B]',
    features: ['Tudo do Básico', 'Assistente com IA', 'Relatórios detalhados', 'Suporte prioritário'],
  },
];

export function ProfessionalSubscriptionPage() {
  const profApi = useApi<{ plan?: string }>('/profile/me/professional');
  const [saving, setSaving] = useState<ProPlan | null>(null);

  const current = (profApi.data?.plan as ProPlan) ?? 'free';

  async function handleChoose(plan: ProPlan) {
    if (plan === current) return;
    setSaving(plan);
    try {
      await api.put('/profile/me/professional', { plan });
      profApi.refetch();
      toast.success('Plano atualizado!');
    } catch {
      toast.error('Não foi possível atualizar o plano.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8" style={font}>
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Assinatura</h1>
        <p className="text-[#64748B] mt-1 text-sm">Gerencie o plano da sua conta de profissional.</p>
      </div>

      {profApi.loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-80 rounded-3xl bg-[#F8FAFC] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 items-start" style={font}>
          {PLANS.map((p) => {
            const isCurrent = p.id === current;
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className={`relative bg-white rounded-3xl p-8 border-2 flex flex-col transition-all ${
                  isCurrent
                    ? 'border-[#10B981] shadow-xl shadow-[#10B981]/10'
                    : p.popular
                      ? 'border-[#0077B6]/40 shadow-lg shadow-[#0077B6]/5 hover:border-[#0077B6]/70'
                      : 'border-[#E2E8F0]'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#10B981] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap shadow-sm">
                    Plano atual
                  </div>
                )}
                {p.popular && !isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0077B6] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap shadow-sm">
                    Mais popular
                  </div>
                )}

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${p.iconColors}`}>
                  <Icon size={22} />
                </div>
                <p className="text-xs font-bold tracking-widest text-[#64748B] uppercase mb-1">Plano</p>
                <h3 className="text-2xl font-extrabold text-[#03045E]">{p.name}</h3>
                <p className="text-3xl font-black text-[#0F172A] mt-3">{p.price}</p>

                <ul className="space-y-3 my-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#0F172A]">
                      <Check size={16} className="text-[#10B981] shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full h-11 rounded-xl bg-[#F0FDF9] border-2 border-[#10B981]/30 flex items-center justify-center gap-2 text-sm font-bold text-[#10B981]">
                    <CheckCircle2 size={15} /> Plano atual
                  </div>
                ) : (
                  <button
                    onClick={() => handleChoose(p.id)}
                    disabled={saving !== null}
                    className="w-full h-11 rounded-xl bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-[#0077B6]/20 disabled:opacity-60"
                  >
                    {saving === p.id ? 'Salvando…' : 'Escolher este plano'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[#94A3B8] italic text-center mt-10" style={font}>
        A integração de pagamento está em desenvolvimento. Esta tela é apenas demonstrativa.
      </p>
    </DashboardLayout>
  );
}
