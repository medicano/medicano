import React, { useState } from 'react';
import {
  Sparkles, Zap, Crown, CheckCircle2, XCircle, Calendar,
  ArrowUpCircle, AlertCircle, X,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ConfirmModal } from '../components/ConfirmModal';
import { useApi } from '../lib/hooks';
import { api } from '../lib/api';

// ─── types & constants ────────────────────────────────────────────────────────

type Plan = 'FREE' | 'BASIC' | 'PRO';
type SubStatus = 'ACTIVE' | 'active' | 'trial' | 'canceled' | 'expired' | 'inactive';

const font: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const PLAN_ORDER: Record<Plan, number> = { FREE: 0, BASIC: 1, PRO: 2 };

const PLAN_META: Record<Plan, { price: string; priceShort: string; monthlyValue: string }> = {
  FREE:  { price: 'Gratuito',   priceShort: 'Gratuito',  monthlyValue: 'R$ 0' },
  BASIC: { price: 'R$ 149/mês', priceShort: 'R$ 149',    monthlyValue: 'R$ 149,00' },
  PRO:   { price: 'R$ 349/mês', priceShort: 'R$ 349',    monthlyValue: 'R$ 349,00' },
};

const statusMap: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE:   { label: 'Ativa',              bg: 'bg-[#A7F3D0]', text: 'text-[#065F46]' },
  active:   { label: 'Ativa',              bg: 'bg-[#A7F3D0]', text: 'text-[#065F46]' },
  trial:    { label: 'Período de teste',   bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
  canceled: { label: 'Cancelada',          bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' },
  expired:  { label: 'Expirada',           bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' },
  inactive: { label: 'Inativa',            bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]' },
};

const limit: Record<Plan, string> = {
  FREE:  'até 2 profissionais',
  BASIC: 'até 10 profissionais',
  PRO:   'profissionais ilimitados',
};

// ─── upgrade modal ────────────────────────────────────────────────────────────

interface UpgradeModalProps {
  plan: Plan;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

function UpgradeModal({ plan, onConfirm, onClose, loading }: UpgradeModalProps) {
  const meta = PLAN_META[plan];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={font}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#03045E]/50 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-[#03045E]/20 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0077B6] to-[#023E8A] px-7 pt-7 pb-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ArrowUpCircle size={24} className="text-white" />
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              <X size={18} />
            </button>
          </div>
          <h2 className="text-xl font-extrabold mt-4">Upgrade para o plano {plan}</h2>
          <p className="text-[#ADE8F4] text-sm mt-1">{meta.monthlyValue} por mês</p>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">
          {/* Plan details */}
          <div className="bg-[#F0FBFF] border border-[#0077B6]/20 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-0.5">Novo plano</p>
              <p className="font-extrabold text-[#03045E] text-lg">{plan}</p>
              <p className="text-sm text-[#64748B]">{limit[plan]}</p>
            </div>
            <span className="text-2xl font-black text-[#0077B6]">{meta.priceShort}</span>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-2xl px-4 py-3.5">
            <AlertCircle size={16} className="text-[#92400E] shrink-0 mt-0.5" />
            <p className="text-sm text-[#92400E]">
              O upgrade é ativado <span className="font-bold">imediatamente</span>. A cobrança será proporcional ao período restante do mês atual.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 pb-7 flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border-2 border-[#E2E8F0] text-[#64748B] font-bold text-sm hover:border-[#0077B6]/40 hover:text-[#0077B6] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm transition-colors shadow-sm shadow-[#10B981]/30 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Processando…
              </>
            ) : (
              <>
                <ArrowUpCircle size={16} /> Confirmar upgrade
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── plan card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: Plan;
  current: Plan;
  icon: React.ElementType;
  price: string;
  features: { ok: boolean; t: string }[];
  popular?: boolean;
  onUpgrade: (plan: Plan) => void;
}

function PlanCard({ plan, current, icon: Icon, price, features, popular, onUpgrade }: PlanCardProps) {
  const isCurrent = plan === current;
  const isInferior = PLAN_ORDER[plan] < PLAN_ORDER[current];
  const isUpgrade = PLAN_ORDER[plan] > PLAN_ORDER[current];

  const iconColors: Record<Plan, string> = {
    FREE:  'bg-[#E0F2FE] text-[#0077B6]',
    BASIC: 'bg-[#A7F3D0] text-[#10B981]',
    PRO:   'bg-[#FEF3C7] text-[#F59E0B]',
  };

  return (
    <div
      className={`relative bg-white rounded-3xl p-8 border-2 flex flex-col transition-all ${
        isCurrent
          ? 'border-[#10B981] shadow-xl shadow-[#10B981]/10'
          : popular && isUpgrade
          ? 'border-[#0077B6]/40 shadow-lg shadow-[#0077B6]/5 hover:border-[#0077B6]/70'
          : 'border-[#E2E8F0] hover:border-[#E2E8F0]'
      }`}
      style={font}
    >
      {/* Badges */}
      {isCurrent && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#10B981] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap shadow-sm">
          Plano atual
        </div>
      )}
      {popular && !isCurrent && isUpgrade && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0077B6] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap shadow-sm">
          Mais popular
        </div>
      )}

      {/* Icon + name */}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${iconColors[plan]}`}>
        <Icon size={22} />
      </div>
      <p className="text-xs font-bold tracking-widest text-[#64748B] uppercase mb-1">Plano</p>
      <h3 className="text-2xl font-extrabold text-[#03045E]">{plan}</h3>
      <p className="text-3xl font-black text-[#0F172A] mt-3">{price}</p>

      {/* Features */}
      <ul className="space-y-3 my-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 text-sm ${f.ok ? 'text-[#0F172A]' : 'text-[#CBD5E1]'}`}>
            {f.ok
              ? <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
              : <XCircle     size={16} className="text-[#CBD5E1] shrink-0 mt-0.5" />}
            {f.t}
          </li>
        ))}
      </ul>

      {/* Action area */}
      {isCurrent && (
        <div className="w-full h-11 rounded-xl bg-[#F0FDF9] border-2 border-[#10B981]/30 flex items-center justify-center gap-2 text-sm font-bold text-[#10B981]">
          <CheckCircle2 size={15} /> Plano atual
        </div>
      )}
      {isInferior && (
        <div className="w-full h-11 rounded-xl bg-[#F8FAFC] border-2 border-[#E2E8F0] flex items-center justify-center gap-2 text-sm font-bold text-[#94A3B8]">
          Plano inferior
        </div>
      )}
      {isUpgrade && (
        <button
          onClick={() => onUpgrade(plan)}
          className="w-full h-11 rounded-xl bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-[#0077B6]/20"
        >
          <ArrowUpCircle size={15} /> Fazer upgrade
        </button>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function SubscriptionPage() {
  const subApi = useApi<any>('/subscriptions');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<Plan | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const current: Plan = subApi.data?.plan ?? 'FREE';
  const subStatus: string = subApi.data?.status ?? 'inactive';
  const expiresAt: string | null = subApi.data?.expiresAt ?? null;
  const s = statusMap[subStatus] ?? statusMap.inactive;

  async function handleUpgradeConfirm() {
    if (!upgradeTarget) return;
    setUpgrading(true);
    try {
      await api.put('/subscriptions', { plan: upgradeTarget });
      subApi.refetch();
      setUpgradeTarget(null);
    } catch (e) {
      // still close on error in demo context
      setUpgradeTarget(null);
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8" style={font}>
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Assinatura</h1>
        <p className="text-[#64748B] mt-1 text-sm">Gerencie seu plano e recursos.</p>
      </div>

      {/* Current plan banner */}
      <div className="bg-gradient-to-br from-[#03045E] to-[#0077B6] rounded-3xl p-8 mb-10 text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-[#00B4D8]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {subApi.loading ? (
            <div className="space-y-3">
              <div className="h-4 w-24 bg-white/20 rounded animate-pulse" />
              <div className="h-10 w-32 bg-white/20 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold tracking-widest text-[#90E0EF] uppercase mb-2" style={font}>Plano atual</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black" style={font}>{current}</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
              </div>
              {expiresAt && (
                <div className="flex items-center gap-2 mt-3 text-sm text-[#CAF0F8]" style={font}>
                  <Calendar size={14} />
                  Expira em {new Date(expiresAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              <p className="text-sm text-[#ADE8F4] mt-1" style={font}>{limit[current]}</p>
            </div>
          )}
          <button
            onClick={() => setCancelOpen(true)}
            disabled={subStatus === 'canceled' || subStatus === 'inactive' || subApi.loading}
            className="text-sm font-semibold text-[#FCA5A5] hover:text-white transition-colors px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={font}
          >
            Cancelar assinatura
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div style={font}>
        <h2 className="text-xl font-bold text-[#03045E] mb-6">Planos disponíveis</h2>

        {subApi.loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-96 rounded-3xl bg-[#F8FAFC] animate-pulse" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 items-start">
            <PlanCard
              plan="FREE"
              current={current}
              icon={Sparkles}
              price="Gratuito"
              onUpgrade={setUpgradeTarget}
              features={[
                { ok: true,  t: 'Até 2 profissionais' },
                { ok: true,  t: 'Agendamentos ilimitados' },
                { ok: true,  t: 'Triagem por chatbot' },
                { ok: false, t: 'Suporte prioritário' },
              ]}
            />
            <PlanCard
              plan="BASIC"
              current={current}
              icon={Zap}
              price="R$ 149/mês"
              popular
              onUpgrade={setUpgradeTarget}
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
              onUpgrade={setUpgradeTarget}
              features={[
                { ok: true, t: 'Profissionais ilimitados' },
                { ok: true, t: 'Agendamentos ilimitados' },
                { ok: true, t: 'Triagem por chatbot' },
                { ok: true, t: 'Suporte prioritário' },
              ]}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-[#94A3B8] italic text-center mt-10" style={font}>
        A integração de pagamento está em desenvolvimento. Esta tela é apenas demonstrativa.
      </p>

      {/* Cancel modal */}
      <ConfirmModal
        open={cancelOpen}
        title="Cancelar assinatura?"
        description="Você manterá acesso aos recursos do plano até a data de expiração atual. Após isso, sua conta será limitada ao plano FREE."
        confirmLabel="Sim, cancelar"
        variant="danger"
        onClose={() => setCancelOpen(false)}
        onConfirm={() => setCancelOpen(false)}
      />

      {/* Upgrade modal */}
      {upgradeTarget && (
        <UpgradeModal
          plan={upgradeTarget}
          loading={upgrading}
          onConfirm={handleUpgradeConfirm}
          onClose={() => { if (!upgrading) setUpgradeTarget(null); }}
        />
      )}
    </DashboardLayout>
  );
}
