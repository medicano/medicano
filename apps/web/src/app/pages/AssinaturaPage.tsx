import React, { useState } from 'react';
import { Sparkles, Zap, Crown, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { useApi } from '../lib/hooks';

type Plan = 'FREE' | 'BASIC' | 'PRO';
type SubStatus = 'active' | 'trial' | 'canceled' | 'expired' | 'inactive';

const statusMap: Record<SubStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Ativa', bg: 'bg-[#A7F3D0]', text: 'text-[#065F46]' },
  trial: { label: 'Período de teste', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
  canceled: { label: 'Cancelada', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' },
  expired: { label: 'Expirada', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' },
  inactive: { label: 'Inativa', bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]' },
};

const limit: Record<Plan, string> = {
  FREE: 'até 2 profissionais',
  BASIC: 'até 10 profissionais',
  PRO: 'profissionais ilimitados',
};

export function AssinaturaPage() {
  const subApi = useApi<any>('/assinatura');
  const [cancelOpen, setCancelOpen] = useState(false);

  const current: Plan = subApi.data?.plan ?? 'FREE';
  const subStatus: SubStatus = subApi.data?.status ?? 'inactive';
  const expiresAt: string | null = subApi.data?.expiresAt ?? null;
  const s = statusMap[subStatus] ?? statusMap.inactive;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Assinatura</h1>
        <p className="text-[#64748B] mt-1 text-sm">Gerencie seu plano e recursos.</p>
      </div>

      <div className="bg-gradient-to-br from-[#03045E] to-[#0077B6] rounded-3xl p-8 mb-10 text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-[#00B4D8]/30 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {subApi.loading ? (
            <div className="space-y-3">
              <div className="h-4 w-24 bg-white/20 rounded animate-pulse" />
              <div className="h-10 w-32 bg-white/20 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold tracking-widest text-[#90E0EF] uppercase mb-2">Plano atual</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black">{current}</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
              </div>
              {expiresAt && (
                <div className="flex items-center gap-2 mt-3 text-sm text-[#CAF0F8]">
                  <Calendar size={14} /> Expira em {new Date(expiresAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              <p className="text-sm text-[#ADE8F4] mt-1">{limit[current]}</p>
            </div>
          )}
          <button
            onClick={() => setCancelOpen(true)}
            disabled={subStatus === 'canceled' || subStatus === 'inactive'}
            className="text-sm font-semibold text-[#FCA5A5] hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancelar assinatura
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-[#03045E] mb-6">Planos disponíveis</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <PlanCard
            plan="FREE"
            current={current}
            icon={Sparkles}
            price="Gratuito"
            features={[
              { ok: true, t: 'Até 2 profissionais' },
              { ok: true, t: 'Agendamentos ilimitados' },
              { ok: true, t: 'Triagem por chatbot' },
              { ok: false, t: 'Suporte prioritário' },
            ]}
          />
          <PlanCard
            plan="BASIC"
            current={current}
            icon={Zap}
            price="R$ 149/mês"
            popular
            features={[
              { ok: true, t: 'Até 10 profissionais' },
              { ok: true, t: 'Agendamentos ilimitados' },
              { ok: true, t: 'Triagem por chatbot' },
              { ok: true, t: 'Suporte por email' },
            ]}
          />
          <PlanCard
            plan="PRO"
            current={current}
            icon={Crown}
            price="R$ 349/mês"
            features={[
              { ok: true, t: 'Profissionais ilimitados' },
              { ok: true, t: 'Agendamentos ilimitados' },
              { ok: true, t: 'Triagem por chatbot' },
              { ok: true, t: 'Suporte prioritário' },
            ]}
          />
        </div>
      </div>

      <p className="text-xs text-[#94A3B8] italic text-center mt-10">
        A integração de pagamento está em desenvolvimento. Esta tela é apenas demonstrativa.
      </p>

      <ConfirmModal
        open={cancelOpen}
        title="Cancelar assinatura?"
        description="Você manterá acesso aos recursos do plano até a data de expiração atual. Após isso, sua conta será limitada ao plano FREE."
        confirmLabel="Sim, cancelar"
        variant="danger"
        onClose={() => setCancelOpen(false)}
        onConfirm={() => setCancelOpen(false)}
      />
    </DashboardLayout>
  );
}

function PlanCard({
  plan, current, icon: Icon, price, features, popular,
}: {
  plan: Plan; current: Plan; icon: React.ElementType;
  price: string; features: { ok: boolean; t: string }[]; popular?: boolean;
}) {
  const isCurrent = plan === current;
  return (
    <div className={`relative bg-white rounded-3xl p-8 border ${popular ? 'border-2 border-[#10B981] shadow-xl shadow-[#10B981]/10' : 'border-[#E2E8F0]'}`}>
      {popular && (
        <div className="absolute -top-3 right-8 bg-[#10B981] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
          Mais popular
        </div>
      )}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
        plan === 'FREE' ? 'bg-[#E0F2FE] text-[#0077B6]' :
        plan === 'BASIC' ? 'bg-[#A7F3D0] text-[#10B981]' :
        'bg-[#FEF3C7] text-[#F59E0B]'
      }`}>
        <Icon size={22} />
      </div>
      <p className="text-xs font-bold tracking-widest text-[#64748B] uppercase mb-1">Plano</p>
      <h3 className="text-2xl font-extrabold text-[#03045E]">{plan}</h3>
      <p className="text-3xl font-black text-[#0F172A] mt-3">{price}</p>
      <ul className="space-y-3 my-8">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 text-sm ${f.ok ? 'text-[#0F172A]' : 'text-[#CBD5E1]'}`}>
            {f.ok
              ? <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
              : <XCircle size={16} className="text-[#CBD5E1] shrink-0 mt-0.5" />}
            {f.t}
          </li>
        ))}
      </ul>
      {isCurrent
        ? <Button variant="outline" className="w-full" disabled>Plano atual</Button>
        : popular
        ? <Button variant="primary" className="w-full">Selecionar</Button>
        : <Button variant="outline" className="w-full">Selecionar</Button>}
    </div>
  );
}
