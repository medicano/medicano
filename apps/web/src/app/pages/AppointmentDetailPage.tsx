import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, Clock, User, Stethoscope, Building2, FileText, Edit3, Lock } from 'lucide-react';

import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { StatusBadge, type AppointmentStatus } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';
import { api } from '../lib/api';
import { mapStatus, formatDateLong, formatSlot } from '../lib/format';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';
import { useAuth } from '../contexts/AuthContext';
import type { Appointment } from '../lib/types';

export function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === 'clinic' || user?.role === 'professional' || user?.role === 'attendant';
  const [apt, setApt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<null | { next: AppointmentStatus; danger?: boolean; title: string; desc: string }>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editStartAt, setEditStartAt] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/appointments/${id}`)
      .then(({ data }) => {
        setApt(data);
        setEditStartAt(data.startAt ? data.startAt.slice(0, 16) : '');
        setEditDuration(data.durationMinutes ?? 60);
        setEditNotes(data.notes ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(next: AppointmentStatus) {
    if (!apt) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/appointments/${apt.id}`, { status: next });
      setApt(data);
    } catch { /* mantém o estado atual se a atualização falhar */ }
    finally { setSaving(false); }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apt) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/appointments/${apt.id}`, { startAt: editStartAt, durationMinutes: editDuration, notes: editNotes });
      setApt(data);
      setEditOpen(false);
    } catch { /* mantém o estado atual se a atualização falhar */ }
    finally { setSaving(false); }
  }

  const status: AppointmentStatus = apt ? mapStatus(apt.status) : 'SCHEDULED';
  const finalized = status === 'COMPLETED' || status === 'CANCELLED';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E2E8F0] rounded-xl w-48" />
          <div className="h-64 bg-[#E2E8F0] rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!apt) {
    return (
      <DashboardLayout>
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] hover:text-[#00B4D8] mb-6">
          <ArrowLeft size={16} /> Voltar
        </button>
        <p className="text-[#64748B]">Agendamento não encontrado.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] hover:text-[#00B4D8] mb-6">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Agendamento</h1>
        </div>
        <StatusBadge status={status} size="lg" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5">
          <Row icon={Calendar} label="Início" value={`${formatDateLong(apt.startAt)} • ${formatSlot(apt.startAt)}`} />
          <Row icon={Clock} label="Duração" value={`${apt.durationMinutes ?? 60} min`} />
          <hr className="border-[#E2E8F0]" />
          <Row icon={User} label="Paciente" value={apt.patientName || apt.patientId || '—'} />
          <Row icon={Stethoscope} label="Profissional" value={apt.professionalName || apt.professionalId || '—'} />
          {apt.specialty && <Row icon={Stethoscope} label="Especialidade" value={SPECIALTY_LABELS[apt.specialty] ?? apt.specialty} />}
          <Row icon={Building2} label="Clínica" value={apt.clinicName || apt.clinicId || '—'} />
          <hr className="border-[#E2E8F0]" />
          <div>
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={14} /> Notas
            </p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#0F172A] leading-relaxed min-h-[3rem]">
              {apt.notes || <span className="text-[#94A3B8]">Sem notas.</span>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-[#64748B] pt-2">
            <div>
              <p className="font-bold uppercase tracking-wider">Criado em</p>
              <p className="mt-1 text-[#0F172A]">{apt.createdAt ? new Date(apt.createdAt).toLocaleString('pt-BR') : '—'}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider">Última atualização</p>
              <p className="mt-1 text-[#0F172A]">{apt.updatedAt ? new Date(apt.updatedAt).toLocaleString('pt-BR') : '—'}</p>
            </div>
          </div>
        </div>

        {isStaff && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 h-fit space-y-3">
            <h3 className="font-bold text-[#03045E] mb-1">Ações</h3>
            {finalized ? (
              <div className="flex items-start gap-2 text-sm text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-3">
                <Lock size={14} className="mt-0.5 shrink-0" />
                Este agendamento está finalizado e não aceita mais alterações.
              </div>
            ) : (
              <>
                {status === 'SCHEDULED' && (
                  <>
                    <Button variant="primary" className="w-full" disabled={saving}
                      onClick={() => setConfirm({ next: 'CONFIRMED', title: 'Confirmar agendamento?', desc: 'O paciente será notificado.' })}>
                      Confirmar
                    </Button>
                    <button onClick={() => setConfirm({ next: 'CANCELLED', danger: true, title: 'Cancelar agendamento?', desc: 'Esta ação não pode ser desfeita.' })}
                      className="w-full h-11 rounded-xl border-2 border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEE2E2] font-medium transition-colors">
                      Cancelar agendamento
                    </button>
                  </>
                )}
                {status === 'CONFIRMED' && (
                  <>
                    <Button variant="primary" className="w-full" disabled={saving}
                      onClick={() => setConfirm({ next: 'COMPLETED', title: 'Marcar como concluído?', desc: 'O atendimento será movido para o histórico.' })}>
                      Marcar como concluído
                    </Button>
                    <button onClick={() => setConfirm({ next: 'CANCELLED', danger: true, title: 'Cancelar agendamento?', desc: 'Esta ação não pode ser desfeita.' })}
                      className="w-full h-11 rounded-xl border-2 border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEE2E2] font-medium transition-colors">
                      Cancelar agendamento
                    </button>
                  </>
                )}
              </>
            )}
            <button onClick={() => setEditOpen(true)} disabled={finalized || saving}
              className="w-full h-11 rounded-xl border-2 border-[#E2E8F0] text-[#03045E] hover:border-[#00B4D8] hover:bg-[#F8FAFC] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
              <Edit3 size={16} /> Editar
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title || ''}
        description={confirm?.desc}
        confirmLabel={confirm?.danger ? 'Sim, cancelar' : 'Confirmar'}
        variant={confirm?.danger ? 'danger' : 'primary'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) updateStatus(confirm.next);
          setConfirm(null);
        }}
      />

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03045E]/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0]">
            <div className="p-6 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#03045E]">Editar agendamento</h3>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleEditSave}>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">Data e hora de início</label>
                <input type="datetime-local" value={editStartAt} onChange={(e) => setEditStartAt(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[15px] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">Duração (minutos)</label>
                <input type="number" value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))} min={15} max={480}
                  className="w-full h-11 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[15px] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">Notas</label>
                <textarea rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-[15px] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8] resize-none" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Row({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#F8FAFC] text-[#0077B6] flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">{label}</p>
        <p className={`text-[#0F172A] mt-0.5 ${mono ? 'font-mono text-sm' : 'font-semibold'}`}>{value}</p>
      </div>
    </div>
  );
}
