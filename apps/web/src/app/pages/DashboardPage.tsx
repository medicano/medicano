import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Calendar, Clock, FileText, ChevronDown, Search, Check, X as XIcon,
  Stethoscope,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { NewAppointmentModal } from '../components/NewAppointmentModal';
import { useAuth } from '../contexts/AuthContext';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';
import { useApi, extractList } from '../lib/hooks';
import { api } from '../lib/api';
import { formatDateShort, formatSlot, initials, mapStatus } from '../lib/format';
import type { Appointment, Professional } from '../lib/types';

// ─── status helpers ────────────────────────────────────────────────────────────
// A API devolve o status em minúsculo (scheduled/confirmed/completed/cancelled).
// mapStatus normaliza para as chaves canônicas usadas aqui. SCHEDULED é exibido
// como "Pendente" (aguardando confirmação).

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  SCHEDULED: { label: 'Pendente',   bg: 'bg-amber-100',   text: 'text-amber-800'  },
  CONFIRMED: { label: 'Confirmado', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  CANCELLED: { label: 'Cancelado',  bg: 'bg-red-100',     text: 'text-red-700'    },
  COMPLETED: { label: 'Concluído',  bg: 'bg-slate-100',   text: 'text-slate-600'  },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CFG[mapStatus(status)] ?? STATUS_CFG.SCHEDULED;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function AvatarCircle({ name }: { name: string }) {
  const i = initials(name);
  return (
    <div className="w-11 h-11 text-sm rounded-full bg-gradient-to-br from-[#90E0EF] to-[#0077B6] flex items-center justify-center text-white font-bold shrink-0">
      {i}
    </div>
  );
}

// ─── date helpers ──────────────────────────────────────────────────────────────

function isToday(iso: string) {
  const d = new Date(iso); const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isFuture(iso: string) { return new Date(iso) > new Date(); }
function isPast(iso: string)   { return new Date(iso) < new Date(); }

// ─── stats card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-4 flex flex-col gap-1">
      <span className={`text-2xl font-extrabold ${accent}`}>{value}</span>
      <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── CLINIC / ATTENDANT VIEW ──────────────────────────────────────────────────

type ClinicTab = 'hoje' | 'proximos' | 'todos' | 'historico';

function ClinicView() {
  const [openNew, setOpenNew] = useState(false);
  const [tab, setTab] = useState<ClinicTab>('todos');
  const [proFilter, setProFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const aptsApi = useApi<Appointment[]>('/appointments');
  const prosApi = useApi<Professional[]>('/professionals');
  const all = extractList<Appointment>(aptsApi.data);
  const pros = extractList<Professional>(prosApi.data);

  const filtered = useMemo(() => {
    let list = [...all];
    if (tab === 'hoje')      list = list.filter((a) => isToday(a.startAt));
    else if (tab === 'proximos') list = list.filter((a) => isFuture(a.startAt) && !isToday(a.startAt));
    else if (tab === 'historico') list = list.filter((a) => isPast(a.startAt) || mapStatus(a.status) === 'CANCELLED' || mapStatus(a.status) === 'COMPLETED');
    if (proFilter)      list = list.filter((a) => a.professionalId === proFilter);
    if (statusFilter)   list = list.filter((a) => mapStatus(a.status) === statusFilter);
    if (query.trim())   list = list.filter((a) => {
      const q = query.toLowerCase();
      return (a.patientName ?? '').toLowerCase().includes(q)
        || (a.professionalName ?? '').toLowerCase().includes(q)
        || (a.specialty ?? '').toLowerCase().includes(q);
    });
    return list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [all, tab, proFilter, statusFilter, query]);

  const stats = useMemo(() => ({
    total:      all.length,
    hoje:       all.filter((a) => isToday(a.startAt)).length,
    pendentes:  all.filter((a) => mapStatus(a.status) === 'SCHEDULED').length,
    confirmados:all.filter((a) => mapStatus(a.status) === 'CONFIRMED').length,
  }), [all]);

  const handleAction = useCallback(async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    setActionLoading(id + status);
    try {
      await api.patch(`/appointments/${id}/status`, { status: status.toLowerCase() });
      aptsApi.refetch();
    } catch { /* mantém a lista atual em caso de falha */ }
    finally { setActionLoading(null); }
  }, [aptsApi]);

  const hasFilters = query || proFilter || statusFilter;

  const TABS: { key: ClinicTab; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'proximos', label: 'Próximos' },
    { key: 'todos', label: 'Todos' },
    { key: 'historico', label: 'Histórico' },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Agenda
          </h1>
          <p className="text-[#64748B] mt-1 text-sm">Gerencie todos os atendimentos da sua clínica.</p>
        </div>
        <button
          onClick={() => setOpenNew(true)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold transition-colors shadow-sm shadow-[#10B981]/30 shrink-0"
        >
          <Plus size={17} /> Novo agendamento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} accent="text-[#03045E]" />
        <StatCard label="Hoje" value={stats.hoje} accent="text-[#0077B6]" />
        <StatCard label="Pendentes" value={stats.pendentes} accent="text-amber-600" />
        <StatCard label="Confirmados" value={stats.confirmados} accent="text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-5 space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por paciente, profissional ou especialidade…"
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Tabs */}
          <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-xl">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === key ? 'bg-white text-[#023E8A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Dropdowns */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <select
                value={proFilter}
                onChange={(e) => setProFilter(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] appearance-none focus:outline-none focus:border-[#00B4D8] transition-colors"
              >
                <option value="">Todos os profissionais</option>
                {pros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] appearance-none focus:outline-none focus:border-[#00B4D8] transition-colors"
              >
                <option value="">Todos os status</option>
                <option value="SCHEDULED">Pendente</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="COMPLETED">Concluído</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            </div>

            {hasFilters && (
              <button
                onClick={() => { setQuery(''); setProFilter(''); setStatusFilter(''); }}
                className="h-9 px-3 text-xs font-bold text-[#0077B6] hover:text-[#023E8A] transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      {aptsApi.loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-[#F8FAFC] rounded-2xl animate-pulse border border-[#E2E8F0]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-4">
            <Calendar size={28} className="text-[#0077B6]" />
          </div>
          <h3 className="font-bold text-[#03045E] text-lg">Nenhum agendamento encontrado</h3>
          <p className="text-sm text-[#64748B] mt-1">
            {hasFilters ? 'Tente ajustar os filtros ou a busca.' : 'Os agendamentos aparecerão aqui quando criados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <ClinicAppointmentCard
              key={a.id}
              apt={a}
              onConfirm={() => handleAction(a.id, 'CONFIRMED')}
              onCancel={() => handleAction(a.id, 'CANCELLED')}
              loading={actionLoading?.startsWith(a.id) ?? false}
            />
          ))}
        </div>
      )}

      <NewAppointmentModal open={openNew} onClose={() => { setOpenNew(false); aptsApi.refetch(); }} />
    </DashboardLayout>
  );
}

function ClinicAppointmentCard({
  apt, onConfirm, onCancel, loading,
}: { apt: Appointment; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const navigate = useNavigate();
  const isPending = mapStatus(apt.status) === 'SCHEDULED';
  const dateLabel = formatDateShort(apt.startAt);
  const timeLabel = formatSlot(apt.startAt);
  const duration = apt.duration ?? apt.durationMinutes ?? 30;

  return (
    <div onClick={() => navigate(`/appointments/${apt.id}`)} className={`cursor-pointer bg-white border rounded-2xl p-5 transition-all hover:shadow-sm hover:border-[#48CAE4] ${isPending ? 'border-amber-200 bg-amber-50/30' : 'border-[#E2E8F0]'}`}>
      <div className="flex items-start gap-4">
        <AvatarCircle name={apt.patientName ?? '?'} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-bold text-[#0F172A] truncate">{apt.patientName ?? 'Paciente'}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[#64748B]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} /> {dateLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} /> {timeLabel} · {duration} min
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[#64748B]">
                <span className="inline-flex items-center gap-1.5">
                  <Stethoscope size={13} /> {apt.professionalName}
                  {apt.specialty && <span className="text-[#0077B6] font-semibold ml-1">· {SPECIALTY_LABELS[apt.specialty] ?? apt.specialty}</span>}
                </span>
              </div>
              {apt.notes && (
                <p className="mt-2 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5">
                  <FileText size={12} /> {apt.notes}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusChip status={apt.status} />
              {isPending && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); onConfirm(); }}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Check size={13} /> Confirmar
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onCancel(); }}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEE2E2] text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <XIcon size={13} /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFESSIONAL VIEW ────────────────────────────────────────────────────────

type ProTab = 'hoje' | 'proximos' | 'historico';

function ProfessionalView() {
  const [tab, setTab] = useState<ProTab>('hoje');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const aptsApi = useApi<Appointment[]>('/appointments');
  const all = extractList<Appointment>(aptsApi.data);

  const filtered = useMemo(() => {
    let list = [...all];
    if (tab === 'hoje')      list = list.filter((a) => isToday(a.startAt));
    else if (tab === 'proximos') list = list.filter((a) => isFuture(a.startAt) && !isToday(a.startAt));
    else if (tab === 'historico') list = list.filter((a) => isPast(a.startAt) || mapStatus(a.status) === 'CANCELLED' || mapStatus(a.status) === 'COMPLETED');
    return list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [all, tab]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      hoje:     all.filter((a) => isToday(a.startAt)).length,
      semana:   all.filter((a) => { const d = new Date(a.startAt); return d >= now && d <= weekEnd; }).length,
      pendentes:all.filter((a) => mapStatus(a.status) === 'SCHEDULED').length,
    };
  }, [all]);

  const handleAction = useCallback(async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    setActionLoading(id + status);
    try {
      await api.patch(`/appointments/${id}/status`, { status: status.toLowerCase() });
      aptsApi.refetch();
    } catch { /* mantém a lista atual em caso de falha */ }
    finally { setActionLoading(null); }
  }, [aptsApi]);

  const PRO_TABS: { key: ProTab; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'proximos', label: 'Próximos' },
    { key: 'historico', label: 'Histórico' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Minha agenda
        </h1>
        <p className="text-[#64748B] mt-1 text-sm">Visualize e gerencie sua agenda de consultas.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Hoje" value={stats.hoje} accent="text-[#0077B6]" />
        <StatCard label="Esta semana" value={stats.semana} accent="text-[#03045E]" />
        <StatCard label="Pendentes" value={stats.pendentes} accent="text-amber-600" />
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-xl mb-5">
        {PRO_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === key ? 'bg-white text-[#023E8A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {aptsApi.loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-[#F8FAFC] rounded-2xl animate-pulse border border-[#E2E8F0]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-4">
            <Calendar size={28} className="text-[#0077B6]" />
          </div>
          <h3 className="font-bold text-[#03045E] text-lg">
            {tab === 'hoje' ? 'Sem atendimentos hoje' : tab === 'proximos' ? 'Nenhum próximo atendimento' : 'Sem histórico de atendimentos'}
          </h3>
          <p className="text-sm text-[#64748B] mt-1">
            {tab === 'historico' ? 'Seus atendimentos passados aparecerão aqui.' : 'Novas consultas aparecerão aqui quando agendadas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <ProAppointmentCard
              key={a.id}
              apt={a}
              onConfirm={() => handleAction(a.id, 'CONFIRMED')}
              onCancel={() => handleAction(a.id, 'CANCELLED')}
              loading={actionLoading?.startsWith(a.id) ?? false}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function ProAppointmentCard({
  apt, onConfirm, onCancel, loading,
}: { apt: Appointment; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const navigate = useNavigate();
  const isPending = mapStatus(apt.status) === 'SCHEDULED';
  const dateLabel = formatDateShort(apt.startAt);
  const timeLabel = formatSlot(apt.startAt);
  const duration = apt.duration ?? apt.durationMinutes ?? 30;

  return (
    <div onClick={() => navigate(`/appointments/${apt.id}`)} className={`cursor-pointer bg-white border rounded-2xl p-5 transition-all hover:shadow-sm hover:border-[#48CAE4] ${isPending ? 'border-amber-200 bg-amber-50/30' : 'border-[#E2E8F0]'}`}>
      <div className="flex items-start gap-4">
        <AvatarCircle name={apt.patientName ?? '?'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-[#0F172A]">{apt.patientName ?? 'Paciente'}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[#64748B]">
                <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> {dateLabel}</span>
                <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {timeLabel} · {duration} min</span>
              </div>
              {apt.notes && (
                <p className="mt-2 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5">
                  <FileText size={12} /> {apt.notes}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusChip status={apt.status} />
              {isPending && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); onConfirm(); }}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Check size={13} /> Confirmar
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onCancel(); }}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEE2E2] text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <XIcon size={13} /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'professional') return <ProfessionalView />;
  return <ClinicView />;
}
