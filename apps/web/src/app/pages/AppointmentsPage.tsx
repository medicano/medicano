import React, { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Calendar, Clock, FileText } from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { useAuth } from '../contexts/AuthContext';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';
import { useApi, extractList } from '../lib/hooks';
import { mapStatus, formatDateShort, formatSlot } from '../lib/format';
import { StatusBadge } from '../components/StatusBadge';
import type { Appointment } from '../lib/types';

// ─── PATIENT VIEW ─────────────────────────────────────────────────────────────

function PatientAppointmentCard({ apt, muted = false }: { apt: Appointment; muted?: boolean }) {
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

  const allApi = useApi<Appointment[]>('/appointments');
  const all = extractList<Appointment>(allApi.data);
  const now = new Date().toISOString();

  const cancelled = (a: Appointment) => a.status?.toLowerCase() === 'cancelled';
  const sortAsc  = (list: Appointment[]) => [...list].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const sortDesc = (list: Appointment[]) => [...list].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

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

  // Staff usa /dashboard como agenda unificada — agenda e agendamentos foram mesclados
  if (role === 'clinic' || role === 'attendant' || role === 'professional') {
    return <Navigate to="/dashboard" replace />;
  }
  return <PatientAgendamentosView />;
}
