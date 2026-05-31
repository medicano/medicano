import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Save, Check, ChevronDown } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { useApi, extractList } from '../lib/hooks';

// ─── types ────────────────────────────────────────────────────────────────────

interface Break { id: string; start: string; end: string }
interface DayConfig { day: string; enabled: boolean; start: string; end: string; breaks: Break[] }
interface AvailConfig { days: DayConfig[]; appointmentDuration: string; minAdvance: string; minCancelAdvance: string }
interface Professional { id: string; name: string; specialty?: string }
type RawProfessional = { _id?: string; id?: string; name?: string; displayName?: string; specialty?: string };
type ProfileRef = { _id?: string; id?: string; name?: string; specialty?: string };

// ─── constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { key: 'monday',    label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday',   label: 'Terça-feira',   short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira',  short: 'Qua' },
  { key: 'thursday',  label: 'Quinta-feira',  short: 'Qui' },
  { key: 'friday',    label: 'Sexta-feira',   short: 'Sex' },
  { key: 'saturday',  label: 'Sábado',        short: 'Sáb' },
  { key: 'sunday',    label: 'Domingo',       short: 'Dom' },
];

const DURATION_OPTS = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
];

const MIN_ADVANCE_OPTS = [
  { value: '1h', label: '1 hora' },
  { value: '2h', label: '2 horas' },
  { value: '4h', label: '4 horas' },
  { value: '24h', label: '24 horas' },
  { value: '48h', label: '48 horas' },
];

const MIN_CANCEL_OPTS = [
  { value: '1h', label: '1 hora' },
  { value: '2h', label: '2 horas' },
  { value: '4h', label: '4 horas' },
  { value: '24h', label: '24 horas' },
  { value: '48h', label: '48 horas' },
  { value: '72h', label: '72 horas' },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

function defaultConfig(): AvailConfig {
  return {
    days: DAYS.map((d) => {
      const isWeekend = d.key === 'saturday' || d.key === 'sunday';
      return {
        day: d.key,
        enabled: !isWeekend,
        start: '08:00',
        end: '18:00',
        breaks: isWeekend ? [] : [{ id: uid(), start: '12:00', end: '13:00' }],
      };
    }),
    appointmentDuration: '30',
    minAdvance: '2h',
    minCancelAdvance: '24h',
  };
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#0077B6]' : 'bg-[#CBD5E1]'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function TimeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</span>}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10 transition-all w-[110px]"
      />
    </div>
  );
}

function NativeSelect({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 pl-3 pr-8 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] appearance-none focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10 transition-all w-full"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
    </div>
  );
}

// ─── day row ──────────────────────────────────────────────────────────────────

function DayRow({
  day, config, onChange,
}: { day: typeof DAYS[number]; config: DayConfig; onChange: (c: DayConfig) => void }) {
  function setEnabled(v: boolean) { onChange({ ...config, enabled: v }); }
  function setStart(v: string) { onChange({ ...config, start: v }); }
  function setEnd(v: string) { onChange({ ...config, end: v }); }

  function addBreak() {
    onChange({ ...config, breaks: [...config.breaks, { id: uid(), start: '12:00', end: '13:00' }] });
  }
  function removeBreak(id: string) {
    onChange({ ...config, breaks: config.breaks.filter((b) => b.id !== id) });
  }
  function updateBreak(id: string, field: 'start' | 'end', v: string) {
    onChange({ ...config, breaks: config.breaks.map((b) => b.id === id ? { ...b, [field]: v } : b) });
  }

  return (
    <div className={`rounded-2xl border transition-all ${config.enabled ? 'border-[#E2E8F0] bg-white' : 'border-[#F1F5F9] bg-[#F8FAFC]'}`}>
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="w-8 sm:w-28 shrink-0 pt-1">
          <span className={`hidden sm:inline text-sm font-bold ${config.enabled ? 'text-[#03045E]' : 'text-[#94A3B8]'}`}>{day.label}</span>
          <span className={`sm:hidden text-sm font-bold ${config.enabled ? 'text-[#03045E]' : 'text-[#94A3B8]'}`}>{day.short}</span>
        </div>
        <Toggle checked={config.enabled} onChange={setEnabled} />
        {config.enabled ? (
          <div className="flex flex-wrap items-end gap-3 flex-1">
            <TimeInput value={config.start} onChange={setStart} label="Início" />
            <TimeInput value={config.end} onChange={setEnd} label="Fim" />
            <button
              type="button"
              onClick={addBreak}
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-dashed border-[#0077B6]/40 text-[#0077B6] text-xs font-semibold hover:bg-[#F0FBFF] hover:border-[#0077B6] transition-colors self-end"
            >
              <Plus size={13} /> Intervalo
            </button>
          </div>
        ) : (
          <span className="pt-1 text-xs text-[#94A3B8]">Sem atendimento</span>
        )}
      </div>

      {/* Break rows */}
      {config.enabled && config.breaks.length > 0 && (
        <div className="px-4 pb-3.5 space-y-2 border-t border-[#F1F5F9] pt-3">
          {config.breaks.map((b) => (
            <div key={b.id} className="flex items-end gap-3 ml-0 sm:ml-[7.5rem]">
              <div className="w-2 h-2 rounded-full bg-[#E2E8F0] mt-4 shrink-0 hidden sm:block" />
              <TimeInput value={b.start} onChange={(v) => updateBreak(b.id, 'start', v)} label="Intervalo início" />
              <TimeInput value={b.end} onChange={(v) => updateBreak(b.id, 'end', v)} label="Intervalo fim" />
              <button
                type="button"
                onClick={() => removeBreak(b.id)}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#94A3B8] hover:border-[#FCA5A5] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors self-end shrink-0"
                aria-label="Remover intervalo"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── loading skeleton ─────────────────────────────────────────────────────────

function ScheduleSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {DAYS.map((d) => (
        <div key={d.key} className="h-16 rounded-2xl bg-[#F1F5F9]" />
      ))}
      <div className="h-32 rounded-2xl bg-[#F1F5F9] mt-6" />
    </div>
  );
}

// ─── availability editor ──────────────────────────────────────────────────────

function AvailabilityEditor({
  professionalId, professionalName,
}: { professionalId: string; professionalName: string }) {
  const [config, setConfig] = useState<AvailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setSaved(false);
    api.get('/availability', { params: { professionalId } })
      .then(({ data }) => setConfig(data ?? defaultConfig()))
      .catch(() => setConfig(defaultConfig()))
      .finally(() => setLoading(false));
  }, [professionalId]);

  function updateDay(dayKey: string, dayConfig: DayConfig) {
    if (!config) return;
    setConfig({ ...config, days: config.days.map((d) => d.day === dayKey ? dayConfig : d) });
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.put(`/availability/${professionalId}`, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(getErrorMessage(e, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-[#03045E] tracking-tight">Disponibilidade semanal</h2>
        <p className="text-sm text-[#64748B] mt-0.5">{professionalName}</p>
      </div>

      {loading ? (
        <ScheduleSkeleton />
      ) : config ? (
        <div className="flex-1 space-y-6">
          {/* Week grid */}
          <div className="space-y-2">
            {DAYS.map((d) => {
              const dayConfig = config.days.find((c) => c.day === d.key) ?? {
                day: d.key, enabled: false, start: '08:00', end: '18:00', breaks: [],
              };
              return (
                <DayRow key={d.key} day={d} config={dayConfig} onChange={(c) => updateDay(d.key, c)} />
              );
            })}
          </div>

          {/* General settings */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
            <h3 className="font-bold text-[#03045E] mb-4">Configurações gerais</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                  Duração da consulta
                </label>
                <NativeSelect
                  value={config.appointmentDuration}
                  onChange={(v) => setConfig({ ...config, appointmentDuration: v })}
                  options={DURATION_OPTS}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                  Antecedência p/ agendar
                </label>
                <NativeSelect
                  value={config.minAdvance}
                  onChange={(v) => setConfig({ ...config, minAdvance: v })}
                  options={MIN_ADVANCE_OPTS}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                  Antecedência p/ cancelar
                </label>
                <NativeSelect
                  value={config.minCancelAdvance}
                  onChange={(v) => setConfig({ ...config, minCancelAdvance: v })}
                  options={MIN_CANCEL_OPTS}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sticky save bar */}
      {!loading && config && (
        <div className="sticky bottom-0 mt-6 bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 shadow-md flex items-center justify-between gap-4">
          <p className="text-sm text-[#64748B]">
            {saveError
              ? <span className="text-[#B91C1C] font-semibold">{saveError}</span>
              : saved
              ? <span className="text-[#10B981] font-semibold flex items-center gap-1.5"><Check size={14} /> Disponibilidade salva com sucesso.</span>
              : 'As alterações entram em vigor imediatamente.'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm transition-colors shadow-sm shadow-[#10B981]/30 disabled:opacity-60 shrink-0"
          >
            <Save size={15} />
            {saving ? 'Salvando…' : 'Salvar disponibilidade'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function AvailabilityPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'clinic';
  const isProfessional = role === 'professional';

  // Always fetch profile/me:
  // - professional role → returns Professional document (_id ≠ User._id)
  // - clinic role → returns Clinic document (_id used to fetch professionals list)
  const profileApi = useApi<ProfileRef>('/profile/me');
  const profileId = profileApi.data?._id ?? profileApi.data?.id ?? null;

  const clinicId = isProfessional ? null : profileId;
  const prosApi = useApi<RawProfessional[]>(clinicId ? `/clinics/${clinicId}/professionals` : null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // For professional role: set selectedId once the profile document loads
  useEffect(() => {
    if (isProfessional && profileId) {
      setSelectedId(profileId);
    }
  }, [isProfessional, profileId]);

  const professionals: Professional[] = extractList<RawProfessional>(prosApi.data).map((p) => ({
    id: p._id ?? p.id ?? '',
    name: p.name ?? p.displayName ?? 'Profissional',
    specialty: p.specialty,
  }));
  const prosLoading = !isProfessional && (profileApi.loading || prosApi.loading);

  // For clinic: auto-select when only one professional
  useEffect(() => {
    if (isProfessional || professionals.length !== 1) return;
    setSelectedId(professionals[0].id);
  }, [isProfessional, professionals.length]);

  const selectedPro = isProfessional
    ? { id: selectedId ?? '', name: profileApi.data?.name ?? user?.name ?? 'Profissional', specialty: profileApi.data?.specialty ?? (user?.specialty as string | undefined) }
    : professionals.find((p) => p.id === selectedId);

  // ── professional (single-column) ──────────────────────────────────────────

  if (isProfessional) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Disponibilidade
          </h1>
          <p className="text-[#64748B] mt-1 text-sm">Gerencie seus horários de atendimento.</p>
        </div>
        {selectedId ? (
          <AvailabilityEditor professionalId={selectedId} professionalName={user?.name ?? 'Profissional'} />
        ) : null}
      </DashboardLayout>
    );
  }

  // ── clinic (two-column) ───────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Disponibilidade</h1>
        <p className="text-[#64748B] mt-1 text-sm">Configure os horários de atendimento por profissional.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left column — professional list */}
        <div className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0]">
              <h2 className="font-bold text-[#03045E] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Profissionais</h2>
            </div>
            {prosLoading ? (
              <div className="p-3 space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-[#F1F5F9]" />)}
              </div>
            ) : professionals.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-[#64748B]">Nenhum profissional cadastrado.</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {professionals.map((pro) => {
                  const initials = (pro.name ?? '??').replace(/^(Dr\.|Dra\.)\s*/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                  const active = selectedId === pro.id;
                  return (
                    <button
                      key={pro.id}
                      onClick={() => setSelectedId(pro.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                        active
                          ? 'border-2 border-[#0077B6] bg-[#CAF0F8]/40'
                          : 'border-2 border-transparent hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        active ? 'bg-[#0077B6] text-white' : 'bg-gradient-to-br from-[#90E0EF] to-[#00B4D8] text-white'
                      }`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${active ? 'text-[#03045E]' : 'text-[#0F172A]'}`}>{pro.name}</p>
                        {pro.specialty && (
                          <p className="text-xs text-[#64748B] truncate">{pro.specialty}</p>
                        )}
                      </div>
                      {active && <div className="w-2 h-2 rounded-full bg-[#0077B6] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column — editor or empty state */}
        <div className="flex-1 min-w-0">
          {selectedId && selectedPro ? (
            <AvailabilityEditor professionalId={selectedId} professionalName={selectedPro.name} />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-[#0077B6]" />
              </div>
              <h3 className="font-bold text-[#03045E] text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Nenhum profissional selecionado</h3>
              <p className="text-sm text-[#64748B] mt-1">Selecione um profissional para configurar a disponibilidade.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
