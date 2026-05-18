import React, { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Eye, Search } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { StatusBadge, type AppointmentStatus } from '../components/StatusBadge';
import { NewAppointmentModal } from '../components/NewAppointmentModal';
import { useApi, extractList } from '../lib/hooks';
import { mapStatus, formatDateShort, formatSlot } from '../lib/format';

export function DashboardPage() {
  const [openNew, setOpenNew] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const aptsApi = useApi<any[]>('/appointments');
  const all = extractList(aptsApi.data);

  const filtered = all.filter((a) => {
    if (filterDate) {
      const d = a.startAt?.slice(0, 10) ?? '';
      if (d !== filterDate) return false;
    }
    if (filterStatus && mapStatus(a.status) !== filterStatus) return false;
    return true;
  });

  const stats = [
    { label: 'Agendados', value: all.filter((a) => mapStatus(a.status) === 'SCHEDULED').length, accent: 'border-l-[#0077B6]', text: 'text-[#0077B6]' },
    { label: 'Confirmados', value: all.filter((a) => mapStatus(a.status) === 'CONFIRMED').length, accent: 'border-l-[#10B981]', text: 'text-[#10B981]' },
    { label: 'Concluídos', value: all.filter((a) => mapStatus(a.status) === 'COMPLETED').length, accent: 'border-l-[#64748B]', text: 'text-[#64748B]' },
    { label: 'Cancelados', value: all.filter((a) => mapStatus(a.status) === 'CANCELLED').length, accent: 'border-l-[#EF4444]', text: 'text-[#EF4444]' },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Agenda</h1>
          <p className="text-[#64748B] mt-1 text-sm">Visualize e gerencie os agendamentos da sua clínica.</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setOpenNew(true)}>
          <Plus size={18} /> Novo agendamento
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl border border-[#E2E8F0] border-l-4 ${s.accent} p-5`}>
            <p className={`text-3xl font-extrabold ${s.text}`}>{s.value}</p>
            <p className="text-sm text-[#64748B] mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#CAF0F8]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:border-[#00B4D8]">
          <option value="">Todos os status</option>
          <option value="SCHEDULED">Agendado</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="COMPLETED">Concluído</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        {(filterDate || filterStatus) && (
          <button onClick={() => { setFilterDate(''); setFilterStatus(''); }} className="text-sm font-semibold text-[#0077B6] hover:text-[#023E8A]">
            Limpar filtros
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.3fr_1fr_1fr_0.7fr_1fr_0.6fr] gap-4 px-6 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div>Data e hora</div>
          <div>Paciente</div>
          <div>Profissional</div>
          <div>Duração</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
        </div>

        {aptsApi.loading ? (
          <div className="px-6 py-8 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-[#F8FAFC] rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#64748B]">
            Nenhum agendamento encontrado.
          </div>
        ) : (
          filtered.map((r) => (
            <Link key={r.id} to={`/agendamentos/${r.id}`}
              className="grid grid-cols-2 md:grid-cols-[1.3fr_1fr_1fr_0.7fr_1fr_0.6fr] gap-4 px-6 py-4 border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC] transition-colors items-center">
              <div className="font-bold text-[#03045E]">{formatDateShort(r.startAt)} • {formatSlot(r.startAt)}</div>
              <div className="text-sm text-[#0F172A] truncate">{r.patientName || r.patientId}</div>
              <div className="text-sm text-[#0F172A] hidden md:block truncate">{r.professionalName || r.professionalId}</div>
              <div className="text-sm text-[#64748B] hidden md:block">{r.durationMinutes ?? 60} min</div>
              <div><StatusBadge status={mapStatus(r.status)} /></div>
              <div className="text-right hidden md:block">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0077B6]">
                  <Eye size={16} /> Ver
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      <NewAppointmentModal open={openNew} onClose={() => { setOpenNew(false); aptsApi.refetch(); }} />
    </DashboardLayout>
  );
}
