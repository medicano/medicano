import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Calendar, Clock, FileText, ChevronDown, Search, Check, X as XIcon,
  Stethoscope,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { useAuth } from '../contexts/AuthContext';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';
import { useApi, extractList } from '../lib/hooks';
import { api } from '../lib/api';
import { mapStatus, formatDateShort, formatSlot, initials } from '../lib/format';
import { StatusBadge } from '../components/StatusBadge';

// ─── status helpers ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Pendente',   bg: 'bg-amber-100',   text: 'text-amber-800'  },
  CONFIRMED: { label: 'Confirmado', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  CANCELLED: { label: 'Cancelado',  bg: 'bg-red-100',     text: 'text-red-700'    },
  COMPLETED: { label: 'Concluído',  bg: 'bg-slate-100',   text: 'text-slate-600'  },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function AvatarCircle({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const i = initials(name);
  const cls = size === 'sm'
    ? 'w-9 h-9 text-xs'
    : 'w-11 h-11 text-sm';
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-[#90E0EF] to-[#0077B6] flex items-center justify-center text-white font-bold shrink-0`}>
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

function ClinicAgendamentosView() {
  const [tab, setTab] = useState<ClinicTab>('todos');
  const [proFilter, setProFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const aptsApi = useApi<any[]>('/appointments');
  const prosApi = useApi<any[]>('/professionals');
  const all = extractList(aptsApi.data);
  const pros = extractList(prosApi.data);

  const filtered = useMemo(() => {
    let list = [...all];
    if (tab === 'hoje')      list = list.filter((a) => isToday(a.startAt));
    else if (tab === 'proximos') list = list.filter((a) => isFuture(a.startAt) && !isToday(a.startAt));
    else if (tab === 'historico') list = list.filter((a) => isPast(a.startAt) || a.status === 'CANCELLED' || a.status === 'COMPLETED');
    if (proFilter)      list = list.filter((a) => a.professionalId === proFilter);
    if (statusFilter)   list = list.filter((a) => a.status === statusFilter);
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
    pendentes:  all.filter((a) => a.status === 'PENDING').length,
    confirmados:all.filter((a) => a.status === 'CONFIRMED').length,
  }), [all]);

  const handleAction = useCallback(async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    setActionLoading(id + status);
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      aptsApi.refetch();
    } catch {}
    finally { setActionLoading(null); }
  }, [aptsApi]);

  const TABS: { key: ClinicTab; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'proximos', label: 'Próximos' },
    { key: 'todos', label: 'Todos' },
    { key: 'historico', label: 'Histórico' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Agendamentos
        </h1>
        <p className="text-[#64748B] mt-1 text-sm">Gerencie todos os atendimentos da sua clínica.</p>
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
                <option value="PENDING">Pendente</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="COMPLETED">Concluído</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            </div>
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
          <p className="text-sm text-[#64748B] mt-1">Tente ajustar os filtros ou a busca.</p>
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
    </DashboardLayout>
  );
}

function ClinicAppointmentCard({
  apt, onConfirm, onCancel, loading,
}: { apt: any; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const navigate = useNavigate();
  const isPending = apt.status === 'PENDING';
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

function ProfessionalAgendamentosView() {
  const [tab, setTab] = useState<ProTab>('hoje');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const aptsApi = useApi<any[]>('/appointments');
  const all = extractList(aptsApi.data);

  const filtered = useMemo(() => {
    let list = [...all];
    if (tab === 'hoje')      list = list.filter((a) => isToday(a.startAt));
    else if (tab === 'proximos') list = list.filter((a) => isFuture(a.startAt) && !isToday(a.startAt));
    else if (tab === 'historico') list = list.filter((a) => isPast(a.startAt) || a.status === 'CANCELLED' || a.status === 'COMPLETED');
    return list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [all, tab]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      hoje:     all.filter((a) => isToday(a.startAt)).length,
      semana:   all.filter((a) => { const d = new Date(a.startAt); return d >= now && d <= weekEnd; }).length,
      pendentes:all.filter((a) => a.status === 'PENDING').length,
    };
  }, [all]);

  const handleAction = useCallback(async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    setActionLoading(id + status);
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      aptsApi.refetch();
    } catch {}
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
          Meus atendimentos
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
}: { apt: any; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const navigate = useNavigate();
  const isPending = apt.status === 'PENDING';
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

// ─── PATIENT VIEW ─────────────────────────────────────────────────────────────

function PatientAppointmentCard({ apt, muted = false }: { apt: any; muted?: boolean }) {
  return (
    <Link
      to={`/appointments/${apt.id}`}
      className={`block border rounded-2xl p-6 transition-all ${
        muted
          ? 'bg-[#F1F5F9] border-[#E2E8F0] hover:border-[#CBD5E1]'
          : 'bg-white border-[#E2E8F0] hover:border-[#48CAE4]'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className={`text-2xl font-extrabold tracking-tight ${muted ? 'text-[#94A3B8]' : 'text-[#03045E]'}`}>
            {formatDateShort(apt.startAt)} • {formatSlot(apt.startAt)}
          </p>
          <div className={`flex items-center gap-1.5 text-sm mt-1 ${muted ? 'text-[#CBD5E1]' : 'text-[#64748B]'}`}>
            <Clock size={14} /> {apt.duration ?? apt.durationMinutes ?? 60} min
          </div>
        </div>
        <StatusBadge status={mapStatus(apt.status)} />
      </div>
      <div className={`grid sm:grid-cols-2 gap-2 text-sm pb-3 ${muted ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
        <p className={`font-semibold ${muted ? 'text-[#94A3B8]' : 'text-[#0F172A]'}`}>{apt.professionalName || '—'}</p>
        <p>{apt.clinicName || '—'}</p>
        {apt.specialty && (
          <p className={muted ? 'text-[#94A3B8]' : 'text-[#0077B6] font-medium'}>
            {SPECIALTY_LABELS[apt.specialty] ?? apt.specialty}
          </p>
        )}
      </div>
      {apt.notes && (
        <div className={`flex items-start gap-2 border rounded-xl px-3 py-2.5 text-sm ${muted ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]'}`}>
          <FileText size={14} className={`mt-0.5 shrink-0 ${muted ? 'text-[#CBD5E1]' : 'text-[#64748B]'}`} />
          {apt.notes}
        </div>
      )}
    </Link>
  );
}

function PatientAgendamentosView() {
  const [tab, setTab] = useState<'proximos' | 'historico'>('proximos');

  const allApi = useApi<any[]>('/appointments');
  const all = extractList(allApi.data);
  const now = new Date().toISOString();

  const cancelled = (a: any) => a.status?.toLowerCase() === 'cancelled';
  const sortAsc  = (list: any[]) => [...list].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const sortDesc = (list: any[]) => [...list].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const upcomingActive    = sortAsc(all.filter(a => a.startAt >= now && !cancelled(a) && a.status?.toLowerCase() !== 'completed'));
  const upcomingCancelled = sortAsc(all.filter(a => a.startAt >= now && cancelled(a)));
  const historyActive     = sortDesc(all.filter(a => a.startAt < now && !cancelled(a)));
  const historyCancelled  = sortDesc(all.filter(a => a.startAt < now && cancelled(a)));

  const activeList    = tab === 'proximos' ? upcomingActive    : historyActive;
  const cancelledList = tab === 'proximos' ? upcomingCancelled : historyCancelled;
  const isEmpty = activeList.length === 0 && cancelledList.length === 0;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8FAFC]">
      <PatientTopbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Meus agendamentos</h1>
          <p className="text-[#64748B] mt-1">Acompanhe o status dos seus atendimentos.</p>
        </div>

        <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-xl mb-6">
          {(['proximos', 'historico'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-white text-[#03045E] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {t === 'proximos' ? 'Próximos' : 'Histórico'}
            </button>
          ))}
        </div>

        {allApi.loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 animate-pulse h-28" />)}
          </div>
        ) : isEmpty ? (
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-6">
              <Calendar size={36} className="text-[#0077B6]" />
            </div>
            <h2 className="text-2xl font-bold text-[#03045E]">
              {tab === 'proximos' ? 'Nenhum agendamento próximo' : 'Sem histórico de consultas'}
            </h2>
            <p className="text-[#64748B] mt-2 max-w-md mx-auto">
              Entre em contato com uma clínica ou profissional para agendar seu primeiro atendimento.
            </p>
          </div>
        ) : (
          <>
            {activeList.length > 0 && (
              <div className="space-y-4">
                {activeList.map(a => <PatientAppointmentCard key={a.id} apt={a} />)}
              </div>
            )}

            {cancelledList.length > 0 && (
              <div className={activeList.length > 0 ? 'mt-8' : ''}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Cancelados</span>
                  <div className="flex-1 h-px bg-[#E2E8F0]" />
                  <span className="text-xs font-semibold text-[#94A3B8]">{cancelledList.length}</span>
                </div>
                <div className="space-y-3">
                  {cancelledList.map(a => <PatientAppointmentCard key={a.id} apt={a} muted />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function AppointmentsPage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'clinic' || role === 'attendant') return <ClinicAgendamentosView />;
  if (role === 'professional') return <ProfessionalAgendamentosView />;
  return <PatientAgendamentosView />;
}
