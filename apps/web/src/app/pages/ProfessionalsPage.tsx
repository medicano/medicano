import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, AlertTriangle, X, Clock } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { useApi, extractList } from '../lib/hooks';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { SpecialtyCombobox, SPECIALTY_LABEL_TO_ENUM } from '../components/SpecialtyCombobox';
import { useAuth } from '../contexts/AuthContext';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';
import type { Professional } from '../lib/types';

const PLAN_LIMITS: Record<string, number> = { free: 2, basic: 10, pro: 999 };

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

interface WeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export function ProfessionalsPage() {
  const { user } = useAuth();
  const profileApi = useApi<{ _id?: string; id?: string }>(user?.role !== 'attendant' ? '/profile/me' : null);
  const clinicId = user?.clinicId ?? profileApi.data?._id ?? profileApi.data?.id ?? null;

  const prosApi = useApi<Professional[]>(clinicId ? `/clinics/${clinicId}/professionals` : null);
  const subApi = useApi<{ plan?: string }>(clinicId ? `/subscriptions/clinic/${clinicId}` : null);

  const isAttendant = user?.role === 'attendant';
  const list = extractList<Professional>(prosApi.data);
  const planName: string = (subApi.data?.plan ?? 'free').toLowerCase();
  const planLimit = PLAN_LIMITS[planName] ?? 10;
  const atLimit = !isAttendant && list.length >= planLimit;

  const [toRemove, setToRemove] = useState<Professional | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newReg, setNewReg] = useState('');

  const [schedulePro, setSchedulePro] = useState<Professional | null>(null);

  function resetForm() {
    setNewName(''); setNewSpecialty(''); setNewPhone(''); setNewReg('');
    setCreateError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError(null);
    try {
      const { data: pro } = await api.post('/professionals', {
        name: newName,
        specialty: SPECIALTY_LABEL_TO_ENUM[newSpecialty] || undefined,
        phone: newPhone || undefined,
        registration: newReg.trim() || undefined,
      });
      const proId = pro?._id ?? pro?.id;
      if (clinicId && proId) {
        await api.post(`/clinics/${clinicId}/professionals/${proId}`);
      }
      prosApi.refetch();
      setCreating(false);
      resetForm();
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Erro ao cadastrar profissional'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!toRemove) return;
    try {
      const proId = toRemove.id ?? toRemove._id;
      if (clinicId) {
        await api.delete(`/clinics/${clinicId}/professionals/${proId}`);
      } else {
        await api.delete(`/professionals/${proId}`);
      }
      prosApi.refetch();
    } catch { /* mantém a lista atual se a remoção falhar */ }
    setToRemove(null);
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Profissionais</h1>
          <p className="text-[#64748B] mt-1 text-sm">
            <span className="font-bold">{list.length}</span> de <span className="font-bold">{planLimit === 999 ? '∞' : planLimit}</span> profissionais ({planName})
          </p>
        </div>
        {!isAttendant && (
          <Button variant="primary" disabled={atLimit} className="gap-2" onClick={() => { resetForm(); setCreating(true); }}>
            <Plus size={18} /> Adicionar profissional
          </Button>
        )}
      </div>

      {atLimit && (
        <div className="mb-6 flex items-start gap-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-2xl px-4 py-3">
          <AlertTriangle size={18} className="text-[#92400E] shrink-0 mt-0.5" />
          <p className="text-sm text-[#92400E] flex-1">
            Você atingiu o limite de profissionais do plano atual. Faça upgrade para adicionar mais.
          </p>
          <a href="/subscription" className="text-sm font-bold text-[#92400E] underline shrink-0">Ver planos</a>
        </div>
      )}

      {prosApi.loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-[#F8FAFC] rounded-2xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-6">
            <Users size={36} className="text-[#0077B6]" />
          </div>
          <h2 className="text-2xl font-bold text-[#03045E]">Nenhum profissional cadastrado</h2>
          <p className="text-[#64748B] mt-2 mb-6 max-w-md mx-auto">
            {isAttendant ? 'Nenhum profissional cadastrado na sua clínica.' : 'Adicione profissionais à sua clínica para começar a agendar atendimentos.'}
          </p>
          {!isAttendant && (
            <Button variant="primary" className="gap-2" onClick={() => { resetForm(); setCreating(true); }}>
              <Plus size={18} /> Adicionar profissional
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[60px_1fr_1fr_1fr_180px] gap-4 px-6 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <div></div><div>Nome</div><div>Especialidade</div><div>Cidade</div><div className="text-right">Ações</div>
          </div>
          {list.map((p) => (
            <div key={p._id ?? p.id} className="grid grid-cols-[48px_1fr_auto] md:grid-cols-[60px_1fr_1fr_1fr_180px] gap-4 items-center px-6 py-4 border-b border-[#E2E8F0] last:border-b-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#48CAE4] to-[#0077B6] text-white font-bold flex items-center justify-center text-sm">
                {p.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">{p.name}</p>
                <p className="text-xs text-[#64748B] md:hidden">{SPECIALTY_LABELS[p.specialty] ?? p.specialty}</p>
              </div>
              <div className="text-sm text-[#0F172A] hidden md:block">{SPECIALTY_LABELS[p.specialty] ?? p.specialty}</div>
              <div className="text-sm text-[#64748B] hidden md:block">{(typeof p.address === 'object' ? p.address.city : undefined) || p.city || '—'}</div>
              <div className="flex items-center justify-end gap-2">
                {!isAttendant && (
                  <button
                    onClick={() => setSchedulePro(p)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] hover:text-[#023E8A] px-3 py-2 rounded-lg hover:bg-[#CAF0F8]/40 transition-colors"
                  >
                    <Clock size={14} /> <span className="hidden md:inline">Horários</span>
                  </button>
                )}
                {!isAttendant && (
                  <button
                    onClick={() => setToRemove(p)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B91C1C] hover:text-[#7F1D1D] px-3 py-2 rounded-lg hover:bg-[#FEE2E2] transition-colors"
                  >
                    <Trash2 size={14} /> <span className="hidden md:inline">Remover</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03045E]/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 pb-4">
              <h3 className="text-lg font-bold text-[#03045E]">Adicionar profissional</h3>
              <button onClick={() => setCreating(false)} className="text-[#64748B] hover:text-[#0F172A]"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="px-6 pb-6 space-y-4">
              {createError && <p className="text-sm text-[#B91C1C] bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg px-3 py-2">{createError}</p>}
              {[
                { label: 'Nome completo', value: newName, setter: setNewName, placeholder: 'Dr. João Silva', required: true },
                { label: 'Registro profissional', value: newReg, setter: setNewReg, placeholder: 'Ex.: CRM, CRN, CRP, COREN, CRO…', required: true },
                { label: 'Telefone', value: newPhone, setter: setNewPhone, placeholder: '(11) 9xxxx-xxxx', required: false },
              ].map(({ label, value, setter, placeholder, required }) => (
                <label key={label} className="block">
                  <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">{label}{required && ' *'}</span>
                  <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} required={required}
                    className="w-full h-11 px-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:bg-white transition-colors" />
                </label>
              ))}
              <SpecialtyCombobox
                label="Especialidade *"
                value={newSpecialty}
                onChange={setNewSpecialty}
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Salvando…' : 'Adicionar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {schedulePro && (
        <ScheduleModal
          pro={schedulePro}
          onClose={() => { setSchedulePro(null); prosApi.refetch(); }}
        />
      )}

      <ConfirmModal
        open={!!toRemove}
        title="Remover profissional?"
        description={`${toRemove?.name} será removido da clínica. Agendamentos existentes serão preservados.`}
        confirmLabel="Sim, remover"
        variant="danger"
        onClose={() => setToRemove(null)}
        onConfirm={handleRemove}
      />
    </DashboardLayout>
  );
}

function ScheduleModal({ pro, onClose }: { pro: Professional; onClose: () => void }) {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState<WeeklySlot>({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 });

  useEffect(() => {
    api.get(`/professionals/${pro.id ?? pro._id}`)
      .then(({ data }) => setSlots(Array.isArray(data.weeklySlots) ? data.weeklySlots : []))
      .catch(() => setSlots([]));
  }, [pro.id, pro._id]);

  function addSlot() {
    if (!newSlot.startTime || !newSlot.endTime) return;
    setSlots((prev) => [...prev, { ...newSlot }]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/professionals/${pro.id ?? pro._id}`, { weeklySlots: slots });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar horários'));
    } finally {
      setSaving(false);
    }
  }

  const slotsByDay = DAYS.map((d) => ({
    ...d,
    slots: slots.filter((s) => s.dayOfWeek === d.value),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03045E]/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-lg font-bold text-[#03045E]">Horários — {pro.name}</h3>
            <p className="text-sm text-[#64748B] mt-0.5">Configure os horários de atendimento semanais</p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#0F172A]"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && <p className="text-sm text-[#B91C1C] bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg px-3 py-2">{error}</p>}

          {/* Add new slot */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Adicionar horário</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-xs text-[#64748B] mb-1">Dia</label>
                <select
                  value={newSlot.dayOfWeek}
                  onChange={(e) => setNewSlot((s) => ({ ...s, dayOfWeek: Number(e.target.value) }))}
                  className="w-full h-9 px-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#00B4D8]"
                >
                  {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">Início</label>
                <input type="time" value={newSlot.startTime}
                  onChange={(e) => setNewSlot((s) => ({ ...s, startTime: e.target.value }))}
                  className="w-full h-9 px-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#00B4D8]" />
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">Fim</label>
                <input type="time" value={newSlot.endTime}
                  onChange={(e) => setNewSlot((s) => ({ ...s, endTime: e.target.value }))}
                  className="w-full h-9 px-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#00B4D8]" />
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">Duração (min)</label>
                <select
                  value={newSlot.slotDurationMinutes}
                  onChange={(e) => setNewSlot((s) => ({ ...s, slotDurationMinutes: Number(e.target.value) }))}
                  className="w-full h-9 px-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#00B4D8]"
                >
                  {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={addSlot}>
              <Plus size={14} /> Adicionar
            </Button>
          </div>

          {/* Slots by day */}
          {slotsByDay.filter((d) => d.slots.length > 0).length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-4">Nenhum horário configurado ainda.</p>
          ) : (
            <div className="space-y-3">
              {slotsByDay.filter((d) => d.slots.length > 0).map((d) => (
                <div key={d.value}>
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">{d.label}</p>
                  <div className="space-y-1.5">
                    {d.slots.map((s, i) => {
                      return (
                        <div key={i} className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5">
                          <span className="text-sm font-semibold text-[#0F172A]">{s.startTime} – {s.endTime}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#64748B]">{s.slotDurationMinutes} min</span>
                            <button
                              onClick={() => removeSlot(slots.indexOf(s))}
                              className="text-[#94A3B8] hover:text-[#B91C1C] transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-[#E2E8F0]">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Salvando…' : 'Salvar horários'}
          </Button>
        </div>
      </div>
    </div>
  );
}
