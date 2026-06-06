import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Building2, CalendarCheck, Clock, AlertCircle, Shuffle } from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { Button } from '../components/ui/Button';
import { Calendar } from '../components/ui/calendar';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { useApi, extractList } from '../lib/hooks';
import { formatDateLong, initials as toInitials } from '../lib/format';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';
import type { Clinic } from '../lib/types';

interface ProfessionalInfo {
  id: string;
  name: string;
  specialty: string;
  clinicName: string;
  clinicId?: string;
}

interface Slot {
  start: string;
  available: boolean;
  label: string;
  durationMinutes?: number;
}

type RawSlot = {
  start?: string;
  startAt?: string;
  time?: string;
  available?: boolean;
  taken?: boolean;
  label?: string;
  durationMinutes?: number;
};

type ProfessionalApiData = {
  name?: string;
  specialty?: string;
  specialties?: string[];
  clinicName?: string;
  clinic?: { id?: string; name?: string };
  clinicId?: string;
};

function toLocalTime(iso: string) {
  if (!iso.includes('T')) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const font: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export function BookingPage() {
  const { professionalId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isAny = professionalId === 'qualquer';
  const clinicIdParam = searchParams.get('clinicId') ?? '';

  // Load professional info (when specific professional is selected)
  const professionalApi = useApi<ProfessionalApiData>((!isAny && professionalId) ? `/professionals/${professionalId}` : null);
  const professional: ProfessionalInfo = useMemo(() => {
    const p: ProfessionalApiData = professionalApi.data ?? {};
    return {
      id: professionalId,
      name: p.name ?? 'Profissional',
      specialty: p.specialty ?? (Array.isArray(p.specialties) ? p.specialties[0] : '') ?? '',
      clinicName: p.clinicName ?? p.clinic?.name ?? '',
      clinicId: p.clinicId ?? p.clinic?.id,
    };
  }, [professionalApi.data, professionalId]);

  // Load clinic info (when "sem preferência" flow)
  const clinicApi = useApi<Clinic>(isAny && clinicIdParam ? `/clinics/${clinicIdParam}` : null);
  const clinicName = isAny ? (clinicApi.data?.name ?? '') : '';

  // Pre-fill from URL params (e.g. when coming from ClinicProfilePage)
  const preSlot = searchParams.get('slot') ?? '';
  const preDate = preSlot ? new Date(preSlot) : undefined;

  const [date, setDate] = useState<Date | undefined>(() => {
    if (preDate && !isNaN(preDate.getTime())) {
      const d = new Date(preDate); d.setHours(0, 0, 0, 0); return d;
    }
    return undefined;
  });
  const [slot, setSlot] = useState<string | null>(preSlot || null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  // When we pre-load slots from the range fetch, skip the next per-day fetch
  const skipFetchRef = useRef(false);

  useEffect(() => {
    if (isAny || !professionalId) { setSlots([]); return; }
    if (skipFetchRef.current) { skipFetchRef.current = false; return; }

    setSlotsLoading(true);

    if (!date) {
      // Initial load: ask backend for the next available day + its slots in one call
      api.get(`/availability/${professionalId}/next`)
        .then(({ data }) => {
          if (data?.date && data?.slots?.length) {
            const d = new Date(data.date + 'T00:00:00'); d.setHours(0, 0, 0, 0);
            const normalized: Slot[] = (data.slots as RawSlot[]).map((s) => ({
              start: s.start ?? s.startAt ?? s.time ?? '',
              available: s.available !== false && !s.taken,
              label: s.label ?? toLocalTime(s.start ?? s.startAt ?? s.time ?? ''),
              durationMinutes: s.durationMinutes,
            }));
            skipFetchRef.current = true;
            setDate(d);
            setSlots(normalized);
          } else {
            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
            setDate(tomorrow);
            setSlots([]);
          }
        })
        .catch(() => {
          const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
          setDate(tomorrow);
          setSlots([]);
        })
        .finally(() => setSlotsLoading(false));
      return;
    }

    // Normal: user picked a specific date
    const dateStr = isoDate(date);
    api.get(`/availability/${professionalId}/slots`, { params: { fromDate: dateStr, toDate: dateStr } })
      .then(({ data }) => {
        const list = extractList<RawSlot>(data);
        const normalized: Slot[] = list.map((s) => ({
          start: s.start ?? s.startAt ?? s.time ?? '',
          available: s.available !== false && !s.taken,
          label: s.label ?? toLocalTime(s.start ?? s.startAt ?? s.time ?? ''),
          durationMinutes: s.durationMinutes,
        }));
        setSlots(normalized);
        setSlot(prev => normalized.some(s => s.start === prev) ? prev : null);
      })
      .catch(() => { setSlots([]); setSlot(null); })
      .finally(() => setSlotsLoading(false));
  }, [date, professionalId, clinicIdParam, isAny]);

  const canConfirm = !!date && !!slot && !submitting;
  const initials = isAny ? '?' : toInitials(professional.name);

  async function handleConfirm() {
    if (!canConfirm || !slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const selectedSlot = slots.find((s) => s.start === slot);
      const payload: {
        startAt: string;
        notes?: string;
        professionalId?: string;
        clinicId?: string;
        durationMinutes?: number;
      } = {
        startAt: slot,
        notes: notes || undefined,
        durationMinutes: selectedSlot?.durationMinutes,
      };
      if (!isAny) {
        payload.professionalId = professionalId;
        // Profissional autônomo não tem clínica — não envia clinicId vazio.
        const cid = professional.clinicId ?? clinicIdParam;
        if (cid) payload.clinicId = cid;
      } else if (clinicIdParam) {
        payload.clinicId = clinicIdParam;
      }
      const { data } = await api.post('/appointments', payload);
      navigate('/book/success', {
        state: {
          professionalName: isAny ? 'A definir pela clínica' : professional.name,
          specialty: isAny ? '' : (SPECIALTY_LABELS[professional.specialty] ?? professional.specialty),
          clinicName: isAny ? clinicName : (professional.clinicName || clinicApi.data?.name || ''),
          dateLabel: date ? formatDateLong(date) : '',
          slot: toLocalTime(slot),
          appointmentId: data?.id ?? data?.appointment?.id,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível concluir o agendamento.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F4F8]" style={font}>
      <PatientTopbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#03045E] via-[#023E8A] to-[#0077B6] overflow-hidden">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-1/4 w-56 h-56 rounded-full bg-white/5" />
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar à busca
          </button>

          <div className="flex flex-col sm:flex-row items-start gap-5">
            {isAny ? (
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
                <Shuffle size={28} className="text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shrink-0 text-white font-bold text-xl">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-widest text-[#90E0EF] uppercase mb-1">Agendar atendimento</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">
                {isAny ? 'Sem preferência de profissional' : professional.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
                {!isAny && professional.specialty && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/85 text-xs font-semibold border border-white/15">
                    {SPECIALTY_LABELS[professional.specialty] ?? professional.specialty}
                  </span>
                )}
                {(isAny ? clinicName : professional.clinicName) && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-[#48CAE4]" /> {isAny ? clinicName : professional.clinicName}
                  </span>
                )}
              </div>
              {isAny && <p className="text-sm text-white/70 mt-2">A clínica designará o profissional disponível.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-16 relative z-10">
        <div className="grid lg:grid-cols-[auto_1fr] gap-6 mb-6">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck size={18} className="text-[#0077B6]" />
              <h3 className="font-bold text-[#03045E]">Escolha uma data</h3>
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { setDate(d); setSlot(null); }}
              disabled={{ before: today }}
              className="rounded-2xl"
            />
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={18} className="text-[#0077B6]" />
              <h3 className="font-bold text-[#03045E]">Horários disponíveis</h3>
            </div>
            {date ? (
              <>
                <p className="text-sm text-[#64748B] mb-4 capitalize">{formatDateLong(date)}</p>
                {slotsLoading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-11 rounded-xl bg-[#F1F5F9] animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8 text-[#64748B]">
                    <div className="w-14 h-14 rounded-2xl bg-[#CAF0F8] flex items-center justify-center mb-3">
                      <AlertCircle size={24} className="text-[#0077B6]" />
                    </div>
                    <p className="text-sm">Nenhum horário disponível para esta data.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {slots.map((s) => {
                      const isUnavailable = !s.available;
                      const isSelected = slot === s.start;
                      return (
                        <button
                          key={s.start}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => setSlot(s.start)}
                          className={`h-11 rounded-xl text-sm font-semibold transition-colors border ${
                            isUnavailable
                              ? 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed line-through'
                              : isSelected
                                ? 'bg-[#023E8A] text-white border-[#023E8A]'
                                : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#00B4D8] hover:bg-[#F0FBFF]'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 text-[#64748B]">
                <div className="w-14 h-14 rounded-2xl bg-[#CAF0F8] flex items-center justify-center mb-3">
                  <Clock size={24} className="text-[#0077B6]" />
                </div>
                <p className="text-sm">Selecione uma data no calendário para ver os horários.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm mb-6">
          <label htmlFor="notes" className="block">
            <span className="font-bold text-[#03045E]">Notas <span className="text-[#94A3B8] font-normal">(opcional)</span></span>
            <p className="text-sm text-[#64748B] mt-1 mb-3">Inclua informações que possam ajudar no atendimento.</p>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Ex.: sintomas, histórico relevante, exames anteriores..."
              className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#94A3B8] resize-none focus:outline-none focus:border-[#00B4D8] focus:bg-white transition-colors"
            />
          </label>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-sm text-[#B91C1C] inline-flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="sticky bottom-4 bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm">
            {date && slot ? (
              <p className="text-[#0F172A]">
                <span className="font-bold capitalize">{formatDateLong(date)}</span> às <span className="font-bold">{toLocalTime(slot)}</span>
                {isAny && <span className="text-[#64748B]"> · Profissional a definir</span>}
              </p>
            ) : (
              <p className="text-[#64748B]">Selecione uma data e horário para continuar.</p>
            )}
          </div>
          <Button
            variant="primary"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="gap-2"
          >
            <CalendarCheck size={18} />
            {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
          </Button>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
