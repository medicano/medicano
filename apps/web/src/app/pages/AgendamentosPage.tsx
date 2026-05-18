import React, { useState } from 'react';
import { Calendar, Clock, FileText } from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { StatusBadge, type AppointmentStatus } from '../components/StatusBadge';
import { useApi, extractList } from '../lib/hooks';
import { mapStatus, formatDateShort, formatSlot } from '../lib/format';

export function AgendamentosPage() {
  const [tab, setTab] = useState<'proximos' | 'historico'>('proximos');

  const allApi = useApi<any[]>('/appointments');
  const all = extractList(allApi.data);
  const now = new Date().toISOString();

  const upcoming = all.filter((a) => {
    const s = String(a.status ?? '').toLowerCase();
    return a.startAt >= now && s !== 'cancelled' && s !== 'completed';
  });
  const history = all.filter((a) => {
    const s = String(a.status ?? '').toLowerCase();
    return a.startAt < now || s === 'cancelled' || s === 'completed';
  });
  const list = tab === 'proximos' ? upcoming : history;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <PatientTopbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-[#03045E] tracking-tight">Meus agendamentos</h1>
          <p className="text-[#64748B] mt-2">Acompanhe o status dos seus atendimentos.</p>
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
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 animate-pulse h-28" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-12 text-center">
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
          <div className="space-y-4">
            {list.map((a) => (
              <div key={a.id} className="bg-white border border-[#E2E8F0] hover:border-[#48CAE4] rounded-2xl p-6 transition-all">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-extrabold text-[#03045E] tracking-tight">
                      {formatDateShort(a.startAt)} • {formatSlot(a.startAt)}
                    </p>
                    <div className="flex items-center gap-1.5 text-sm text-[#64748B] mt-1">
                      <Clock size={14} /> {a.durationMinutes ?? 60} min
                    </div>
                  </div>
                  <StatusBadge status={mapStatus(a.status)} />
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-sm text-[#64748B] pb-3">
                  <p className="font-semibold text-[#0F172A]">{a.professionalName || '—'}</p>
                  <p>{a.clinicName || '—'}</p>
                  {a.specialty && <p className="text-[#0077B6] font-medium">{a.specialty}</p>}
                </div>

                {a.notes && (
                  <div className="flex items-start gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#0F172A]">
                    <FileText size={14} className="mt-0.5 text-[#64748B] shrink-0" />
                    {a.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
