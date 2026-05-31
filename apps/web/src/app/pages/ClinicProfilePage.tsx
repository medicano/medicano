import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Building2, MapPin, Phone, Globe, Clock,
  Stethoscope, Calendar, AlertCircle, CheckCircle2,
  ChevronRight, Mail, Navigation, ExternalLink, CalendarCheck,
  User,
} from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import { api } from '../lib/api';
import { extractList } from '../lib/hooks';
import { formatDateLong } from '../lib/format';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';

const font: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface ClinicData {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: Record<string, unknown>;
  addressText?: string;
  hours?: string;
  specialties?: string[];
}

interface Slot { start: string; available: boolean; label: string; }
type ProItem = { id: string; _id?: string; name?: string; specialty?: string };
type RawSlot = { start?: string; startAt?: string; available?: boolean; taken?: boolean; label?: string };


function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function toLocalTime(iso: string) {
  if (!iso.includes('T')) return iso;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function displayAddress(clinic: ClinicData): string {
  if (clinic.addressText) return clinic.addressText;
  if (clinic.address && typeof clinic.address === 'object') {
    const a = clinic.address as Record<string, string>;
    const parts = [
      a.street && a.number ? `${a.street}, ${a.number}` : a.street,
      a.neighborhood,
      a.city && a.state ? `${a.city}/${a.state}` : a.city,
    ].filter(Boolean);
    return parts.join(' — ');
  }
  return '';
}

function splitAddressForHero(clinic: ClinicData): { street: string; location: string } {
  if (clinic.address && typeof clinic.address === 'object') {
    const a = clinic.address as Record<string, string>;
    const street = [a.street, a.number].filter(Boolean).join(', ');
    const location = [
      a.neighborhood,
      a.city && a.state ? `${a.city} / ${a.state}` : (a.city || a.state),
    ].filter(Boolean).join(' · ');
    return { street, location };
  }
  if (clinic.addressText) {
    const parts = clinic.addressText.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length <= 1) return { street: clinic.addressText, location: '' };
    // If the last segment looks like a number, it's the house number — pair it with the street
    const last = parts[parts.length - 1];
    if (/^\d+\w*$/.test(last)) {
      return { street: `${parts[0]}, ${last}`, location: parts.slice(1, -1).join(', ') };
    }
    return { street: parts[0], location: parts.slice(1).join(', ') };
  }
  return { street: '', location: '' };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F0F4F8]" style={font}>
      <PatientTopbar />
      <div className="h-44 bg-gradient-to-br from-[#03045E] to-[#0077B6] animate-pulse" />
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] h-64 animate-pulse" />
            <div className="bg-white rounded-3xl border border-[#E2E8F0] h-48 animate-pulse" />
          </div>
          <div className="bg-white rounded-3xl border border-[#E2E8F0] h-[500px] animate-pulse" />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
      done ? 'bg-[#10B981] border-[#10B981] text-white' :
      active ? 'bg-[#0077B6] border-[#0077B6] text-white' :
      'bg-white border-[#E2E8F0] text-[#94A3B8]'
    }`}>
      {done ? <CheckCircle2 size={14} /> : n}
    </div>
  );
}

// ── Professional selector card ────────────────────────────────────────────────
function ProCard({ pro, selected, onSelect }: { pro: ProItem; selected: boolean; onSelect: () => void }) {
  const initials = (pro.name ?? '??')
    .replace(/^(Dr\.|Dra\.)\s*/i, '')
    .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
        selected
          ? 'border-[#0077B6] bg-[#EFF8FF] shadow-sm'
          : 'border-[#E2E8F0] bg-white hover:border-[#90E0EF] hover:bg-[#F0FBFF]'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
        selected ? 'bg-[#0077B6] text-white' : 'bg-gradient-to-br from-[#90E0EF] to-[#48CAE4] text-white'
      }`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${selected ? 'text-[#0077B6]' : 'text-[#03045E]'}`}>{pro.name}</p>
        <p className="text-xs text-[#64748B] truncate">{SPECIALTY_LABELS[pro.specialty] ?? pro.specialty}</p>
      </div>
      {selected && <CheckCircle2 size={16} className="text-[#0077B6] shrink-0" />}
    </button>
  );
}

// ── Slot grid ─────────────────────────────────────────────────────────────────
function SlotGrid({ slots, loading, selectedSlot, onSelect }: {
  slots: Slot[] | null; loading: boolean;
  selectedSlot: string | null; onSelect: (s: Slot) => void;
}) {
  if (loading) return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-[#E2E8F0] animate-pulse" />
      ))}
    </div>
  );
  if (!slots) return (
    <div className="text-center py-6 text-[#94A3B8] text-sm">Selecione um profissional para ver os horários.</div>
  );
  if (slots.length === 0) return (
    <div className="text-center py-6 text-[#94A3B8] text-sm">Nenhum horário nesta data.</div>
  );
  const available = slots.filter(s => s.available);
  if (available.length === 0) return (
    <div className="text-center py-6 text-[#94A3B8] text-sm">Todos os horários estão ocupados.</div>
  );
  return (
    <div>
      <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
        {available.length} horário{available.length !== 1 ? 's' : ''} disponíve{available.length !== 1 ? 'is' : 'l'}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((s) => (
          <button
            key={s.start}
            disabled={!s.available}
            onClick={() => s.available && onSelect(s)}
            className={`h-10 rounded-xl text-sm font-bold transition-all border-2 ${
              !s.available
                ? 'bg-[#F8FAFC] text-[#CBD5E1] border-transparent cursor-not-allowed line-through'
                : s.start === selectedSlot
                ? 'bg-[#0077B6] text-white border-[#0077B6] shadow-md scale-105'
                : 'bg-white text-[#334155] border-[#E2E8F0] hover:border-[#0077B6] hover:text-[#0077B6]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ClinicProfilePage() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const navigate = useNavigate();

  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [professionals, setProfessionals] = useState<ProItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [selectedPro, setSelectedPro] = useState<ProItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([
      api.get(`/clinics/${clinicId}`),
      api.get(`/clinics/${clinicId}/professionals`),
    ])
      .then(([clinicRes, prosRes]) => {
        setClinic(clinicRes.data);
        const list: ProItem[] = Array.isArray(prosRes.data)
          ? prosRes.data
          : (prosRes.data?.professionals ?? []);
        setProfessionals(list.map((p) => ({ ...p, id: p.id ?? p._id ?? '' })));
      })
      .catch((e) => setError(e?.response?.data?.message || 'Clínica não encontrada'))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    if (!selectedPro || !selectedDate || selectedPro.id === 'any') {
      setSlots(null);
      setSelectedSlot(null);
      return;
    }
    setSlotsLoading(true);
    setSelectedSlot(null);
    const dateStr = isoDate(selectedDate);
    api.get(`/availability/${selectedPro.id}/slots`, {
      params: { fromDate: dateStr, toDate: dateStr },
    })
      .then(({ data }) => {
        const list = extractList<RawSlot>(data);
        setSlots(list.map((s) => ({
          start: s.start ?? s.startAt ?? '',
          available: s.available !== false && !s.taken,
          label: s.label ?? toLocalTime(s.start ?? s.startAt ?? ''),
        })));
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedPro, selectedDate]);

  const specialties = Array.from(
    new Set([
      ...(clinic?.specialties ?? []),
      ...professionals.map((p) => p.specialty).filter(Boolean),
    ])
  );

  // For "any" professional, slot step is skipped
  const isAny = selectedPro?.id === 'any';
  const step = !selectedPro ? 1 : !selectedDate ? 2 : (!isAny && !selectedSlot) ? 3 : 4;
  const stepCount = isAny ? 3 : 4;
  const stepLabels = isAny
    ? ['Profissional', 'Data', 'Confirmar']
    : ['Profissional', 'Data', 'Horário', 'Confirmar'];

  function handleConfirm() {
    if (!selectedPro || !selectedDate) return;
    if (isAny) {
      navigate(`/book/qualquer?clinicId=${clinicId}`);
    } else if (selectedSlot) {
      navigate(`/book/${selectedPro.id}?clinicId=${clinicId}&slot=${encodeURIComponent(selectedSlot)}`);
    }
  }

  const address = clinic ? displayAddress(clinic) : '';
  const { street: heroStreet, location: heroLocation } = clinic ? splitAddressForHero(clinic) : { street: '', location: '' };
  const mapsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : undefined;

  if (loading) return <PageSkeleton />;
  if (error || !clinic) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F0F4F8]" style={font}>
        <PatientTopbar />
        <main className="flex-1 max-w-[900px] mx-auto px-4 py-10 w-full">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#0077B6] mb-6">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
            <AlertCircle size={40} className="text-[#EF4444] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#03045E]">{error ?? 'Clínica não encontrada'}</h2>
          </div>
        </main>
        <AppFooter />
      </div>
    );
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
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
              <Building2 size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">{clinic.name}</h1>
              <div className="flex flex-wrap items-start gap-x-5 gap-y-2 text-sm text-white/75">
                {heroStreet && (
                  <span className="flex items-start gap-1.5">
                    <MapPin size={13} className="text-[#48CAE4] mt-0.5 shrink-0" />
                    <span>
                      <span className="font-bold text-white">{heroStreet}</span>
                      {heroLocation && <span className="block text-xs text-white/55 mt-0.5">{heroLocation}</span>}
                    </span>
                  </span>
                )}
                {clinic.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={12} className="text-[#48CAE4]" />
                    {clinic.phone}
                  </span>
                )}
                {clinic.hours && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} className="text-[#48CAE4]" />
                    {clinic.hours.split('|')[0].trim()}
                  </span>
                )}
              </div>
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {specialties.map((s) => (
                    <span key={s} className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold border border-white/15">
                      {SPECIALTY_LABELS[s] ?? s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-16 relative z-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* ── LEFT: booking wizard ── */}
          <div className="space-y-4">

            {/* Steps header */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm px-6 py-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarCheck size={18} className="text-[#0077B6]" />
                <h2 className="font-extrabold text-[#03045E]">Agendar consulta</h2>
              </div>
              <div className="flex items-center gap-2 mt-4">
                {stepLabels.map((label, i) => (
                  <React.Fragment key={label}>
                    <div className="flex flex-col items-center gap-1">
                      <StepDot n={i+1} active={step === i+1} done={step > i+1} />
                      <span className={`text-[10px] font-semibold hidden sm:block ${step === i+1 ? 'text-[#0077B6]' : step > i+1 ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                        {label}
                      </span>
                    </div>
                    {i < stepCount - 1 && <div className={`flex-1 h-0.5 rounded-full ${step > i+1 ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step 1 – Profissional */}
            <div className="bg-white border-2 border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
              <div className={`px-6 py-4 flex items-center justify-between ${step > 1 ? 'cursor-pointer' : ''}`}
                onClick={() => step > 1 && setSelectedPro(null)}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step > 1 ? 'bg-[#10B981] text-white' : 'bg-[#0077B6] text-white'
                  }`}>
                    {step > 1 ? <CheckCircle2 size={14} /> : '1'}
                  </div>
                  <span className="font-bold text-[#03045E]">Escolha o profissional</span>
                </div>
                {step > 1 && selectedPro && (
                  <span className="text-sm font-semibold text-[#0077B6]">{selectedPro.name} · alterar</span>
                )}
              </div>
              {step === 1 && (
                <div className="px-5 pb-5 space-y-2">
                  {professionals.length === 0 ? (
                    <p className="text-sm text-[#94A3B8] text-center py-4">Nenhum profissional cadastrado.</p>
                  ) : (
                    <>
                      {professionals.map((pro) => (
                        <ProCard key={pro.id} pro={pro} selected={selectedPro?.id === pro.id}
                          onSelect={() => { setSelectedPro(pro); setSelectedDate(undefined); setSelectedSlot(null); }} />
                      ))}
                      <button
                        onClick={() => { setSelectedPro({ id: 'any', name: 'Sem preferência', specialty: '' }); setSelectedDate(undefined); setSelectedSlot(null); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                          selectedPro?.id === 'any' ? 'border-[#0077B6] bg-[#EFF8FF]' : 'border-dashed border-[#CBD5E1] hover:border-[#90E0EF] bg-[#F8FAFC]'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${selectedPro?.id === 'any' ? 'bg-[#0077B6] text-white' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
                          <User size={18} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${selectedPro?.id === 'any' ? 'text-[#0077B6]' : 'text-[#64748B]'}`}>Sem preferência</p>
                          <p className="text-xs text-[#94A3B8]">A clínica aloca o profissional disponível</p>
                        </div>
                        {selectedPro?.id === 'any' && <CheckCircle2 size={16} className="text-[#0077B6] ml-auto" />}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Step 2 – Data */}
            {step >= 2 && (
              <div className="bg-white border-2 border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
                <div className={`px-6 py-4 flex items-center justify-between ${step > 2 ? 'cursor-pointer' : ''}`}
                  onClick={() => step > 2 && setSelectedDate(undefined)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step > 2 ? 'bg-[#10B981] text-white' : 'bg-[#0077B6] text-white'
                    }`}>
                      {step > 2 ? <CheckCircle2 size={14} /> : '2'}
                    </div>
                    <span className="font-bold text-[#03045E]">Escolha a data</span>
                  </div>
                  {step > 2 && selectedDate && (
                    <span className="text-sm font-semibold text-[#0077B6] capitalize">{formatDateLong(selectedDate)} · alterar</span>
                  )}
                </div>
                {step === 2 && (
                  <div className="px-4 pb-5 flex justify-center">
                    <CalendarPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
                      disabled={{ before: today }}
                      className="rounded-2xl"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3 – Horário (só para profissional específico) */}
            {step >= 3 && !isAny && (
              <div className="bg-white border-2 border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
                <div className={`px-6 py-4 flex items-center justify-between ${step > 3 ? 'cursor-pointer' : ''}`}
                  onClick={() => step > 3 && setSelectedSlot(null)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step > 3 ? 'bg-[#10B981] text-white' : 'bg-[#0077B6] text-white'
                    }`}>
                      {step > 3 ? <CheckCircle2 size={14} /> : '3'}
                    </div>
                    <span className="font-bold text-[#03045E]">Escolha o horário</span>
                  </div>
                  {step > 3 && selectedSlot && (
                    <span className="text-sm font-semibold text-[#0077B6]">{toLocalTime(selectedSlot)} · alterar</span>
                  )}
                </div>
                {step === 3 && (
                  <div className="px-5 pb-5">
                    <SlotGrid
                      slots={slots}
                      loading={slotsLoading}
                      selectedSlot={selectedSlot}
                      onSelect={(s) => setSelectedSlot(s.start)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 4 – Confirmar */}
            {step === 4 && (
              <div className="bg-gradient-to-br from-[#03045E] to-[#0077B6] border-2 border-[#0077B6] rounded-3xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck size={20} className="text-[#48CAE4]" />
                  <span className="font-extrabold text-lg">Confirme sua consulta</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 space-y-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <span className="block text-xs text-white/70">Clínica</span>
                      <p className="font-bold">{clinic.name}</p>
                    </div>
                  </div>
                  {!isAny && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <User size={16} />
                      </div>
                      <div>
                        <span className="block text-xs text-white/70">Profissional</span>
                        <p className="font-bold">
                          {selectedPro?.name}
                          {selectedPro?.specialty && (
                            <span className="font-normal text-white/80"> — {SPECIALTY_LABELS[selectedPro.specialty] ?? selectedPro.specialty}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <span className="block text-xs text-white/70">Data{!isAny && ' e horário'}</span>
                      <p className="font-bold capitalize">
                        {selectedDate && formatDateLong(selectedDate)}
                        {!isAny && selectedSlot && ` às ${toLocalTime(selectedSlot)}`}
                      </p>
                    </div>
                  </div>
                  {address && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <span className="block text-xs text-white/70">Endereço</span>
                        <p className="font-bold">{address}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleConfirm}
                  className="w-full h-13 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-base transition-colors shadow-lg flex items-center justify-center gap-2 py-3"
                >
                  <CalendarCheck size={18} /> Confirmar agendamento
                </button>
                <p className="text-center text-xs text-white/50 mt-3">Você poderá cancelar com antecedência conforme a política da clínica</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: clinic info (sticky) ── */}
          <div className="space-y-4 lg:sticky lg:top-4">

            {/* Quick info card */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="font-bold text-[#03045E]">Informações</h3>
                <button onClick={() => setInfoOpen(v => !v)} className="text-xs text-[#0077B6] font-semibold">
                  {infoOpen ? 'Ocultar' : 'Ver mais'}
                </button>
              </div>
              <div className="p-5 space-y-3">
                {clinic.phone && (
                  <a href={`tel:${clinic.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F0FBFF] border border-[#E2E8F0] transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-[#CAF0F8] flex items-center justify-center shrink-0">
                      <Phone size={15} className="text-[#0077B6]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#94A3B8] font-semibold">Telefone</p>
                      <p className="text-sm font-bold text-[#03045E] group-hover:text-[#0077B6]">{clinic.phone}</p>
                    </div>
                    <ChevronRight size={14} className="text-[#CBD5E1] ml-auto group-hover:text-[#0077B6]" />
                  </a>
                )}
                {address && (
                  <a href={mapsHref} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F0FBFF] border border-[#E2E8F0] transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-[#CAF0F8] flex items-center justify-center shrink-0">
                      <MapPin size={15} className="text-[#0077B6]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#94A3B8] font-semibold">Endereço</p>
                      <p className="text-sm font-bold text-[#03045E] group-hover:text-[#0077B6] truncate">{address}</p>
                    </div>
                    <Navigation size={14} className="text-[#CBD5E1] ml-auto shrink-0 group-hover:text-[#0077B6]" />
                  </a>
                )}
                {clinic.hours && (
                  <div className="flex items-start gap-3 p-3 rounded-2xl border border-[#E2E8F0]">
                    <div className="w-9 h-9 rounded-xl bg-[#CAF0F8] flex items-center justify-center shrink-0">
                      <Clock size={15} className="text-[#0077B6]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#94A3B8] font-semibold mb-1">Funcionamento</p>
                      {clinic.hours.split('|').map((h, i) => (
                        <p key={i} className="text-sm font-semibold text-[#334155]">{h.trim()}</p>
                      ))}
                    </div>
                  </div>
                )}
                {infoOpen && (
                  <>
                    {clinic.email && (
                      <a href={`mailto:${clinic.email}`}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F0FBFF] border border-[#E2E8F0] transition-colors group">
                        <div className="w-9 h-9 rounded-xl bg-[#CAF0F8] flex items-center justify-center shrink-0">
                          <Mail size={15} className="text-[#0077B6]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[#94A3B8] font-semibold">E-mail</p>
                          <p className="text-sm font-bold text-[#0077B6] truncate">{clinic.email}</p>
                        </div>
                      </a>
                    )}
                    {clinic.website && (
                      <a href={clinic.website.startsWith('http') ? clinic.website : `https://${clinic.website}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F0FBFF] border border-[#E2E8F0] transition-colors group">
                        <div className="w-9 h-9 rounded-xl bg-[#CAF0F8] flex items-center justify-center shrink-0">
                          <Globe size={15} className="text-[#0077B6]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[#94A3B8] font-semibold">Site</p>
                          <p className="text-sm font-bold text-[#0077B6] truncate flex items-center gap-1">
                            {clinic.website} <ExternalLink size={11} />
                          </p>
                        </div>
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Team summary */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
                <Stethoscope size={15} className="text-[#0077B6]" />
                <h3 className="font-bold text-[#03045E]">Equipe</h3>
                <span className="ml-auto text-xs font-bold text-[#94A3B8]">
                  {professionals.length} profissional{professionals.length !== 1 ? 'is' : ''}
                </span>
              </div>
              <div className="p-4 space-y-2">
                {professionals.slice(0, 4).map((pro) => {
                  const initials = (pro.name ?? '??')
                    .replace(/^(Dr\.|Dra\.)\s*/i, '')
                    .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <button
                      key={pro.id}
                      onClick={() => { setSelectedPro(pro); setSelectedDate(undefined); setSelectedSlot(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#F0FBFF] transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#90E0EF] to-[#0077B6] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#03045E] truncate">{pro.name}</p>
                        <p className="text-xs text-[#64748B]">{SPECIALTY_LABELS[pro.specialty] ?? pro.specialty}</p>
                      </div>
                      <span className="text-xs font-bold text-[#0077B6] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Agendar</span>
                    </button>
                  );
                })}
                {professionals.length === 0 && (
                  <p className="text-sm text-[#94A3B8] text-center py-3">Nenhum profissional cadastrado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
