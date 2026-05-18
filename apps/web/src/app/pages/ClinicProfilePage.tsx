import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft, Building2, MapPin, Phone, Globe, Clock,
  Stethoscope, Calendar, AlertCircle, ChevronRight, Users, Shuffle
} from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { Button } from '../components/ui/Button';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import { api } from '../lib/api';
import { extractList } from '../lib/hooks';
import { formatDateLong } from '../lib/format';

interface ClinicAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface ClinicData {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  address?: ClinicAddress | string;
  hours: string;
}

interface Slot {
  start: string;
  available: boolean;
  label: string;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const SPECIALTY_LABELS: Record<string, string> = {
  medicine: 'Clínica Geral / Medicina',
  psychology: 'Psicologia',
  psychiatry: 'Psiquiatria',
  dentistry: 'Odontologia',
  nutrition: 'Nutrição',
};

function specialtyLabel(value: string): string {
  return SPECIALTY_LABELS[value] ?? value;
}

function formatAddress(address?: ClinicAddress | string): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const parts = [
    address.street && address.number ? `${address.street}, ${address.number}` : address.street,
    address.complement,
    address.neighborhood,
    address.city && address.state ? `${address.city}/${address.state}` : address.city,
  ].filter(Boolean);
  return parts.join(' — ');
}

function toLocalTime(iso: string) {
  if (!iso.includes('T')) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ClinicProfilePage() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const navigate = useNavigate();

  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0); return today;
  });

  // slots per professional: { [proId]: Slot[] }
  const [slotsMap, setSlotsMap] = useState<Record<string, Slot[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([
      api.get(`/clinics/${clinicId}`),
      api.get(`/clinics/${clinicId}/professionals`),
    ])
      .then(([clinicRes, prosRes]) => {
        setClinic(clinicRes.data);
        const list = Array.isArray(prosRes.data) ? prosRes.data : (prosRes.data?.professionals ?? []);
        setProfessionals(list.map((p: any) => ({
          ...p,
          id: p.id ?? p._id,
          city: p.address?.city ?? '',
        })));
      })
      .catch((e) => setError(e?.response?.data?.message || 'Clínica não encontrada'))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    if (!selectedDate || !clinic || professionals.length === 0) {
      setSlotsMap({});
      return;
    }
    setSlotsLoading(true);
    const dateStr = isoDate(selectedDate);
    Promise.all(
      professionals.map((pro) =>
        api.get(`/availability/${pro.id}`, { params: { fromDate: dateStr, toDate: dateStr } })
          .then(({ data }) => {
            const list = extractList<any>(data);
            return {
              id: pro.id,
              slots: list.map((s: any) => ({
                start: s.start ?? s.startAt ?? s.time,
                available: s.available !== false && !s.taken,
                label: s.label ?? toLocalTime(s.start ?? s.startAt ?? s.time),
              })),
            };
          })
          .catch(() => ({ id: pro.id, slots: [] }))
      )
    ).then((results) => {
      const map: Record<string, Slot[]> = {};
      results.forEach(({ id, slots }) => { map[id] = slots; });
      setSlotsMap(map);
    }).finally(() => setSlotsLoading(false));
  }, [selectedDate, clinic, professionals]);

  const specialties = Array.from(
    new Set(professionals.map((p) => p.specialty).filter(Boolean))
  );

  function handleSlotClick(pro: any, slot: Slot) {
    navigate(`/agendar/${pro.id}?clinicId=${clinicId}&slot=${encodeURIComponent(slot.start)}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <PatientTopbar />
        <main className="flex-1 max-w-[1100px] w-full mx-auto px-8 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-24 bg-[#E2E8F0] rounded" />
            <div className="h-48 bg-[#E2E8F0] rounded-3xl" />
            <div className="h-96 bg-[#E2E8F0] rounded-3xl" />
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <PatientTopbar />
        <main className="flex-1 max-w-[1100px] w-full mx-auto px-8 py-10">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#0077B6] hover:text-[#023E8A] mb-6">
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PatientTopbar />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-8 py-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0077B6] hover:text-[#023E8A] mb-6"
        >
          <ArrowLeft size={16} /> Voltar à busca
        </button>

        {/* Clinic header */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#48CAE4] to-[#0077B6] flex items-center justify-center shrink-0">
              <Building2 size={36} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">{clinic.name}</h1>
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {specialties.map((s) => (
                    <span key={s} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#CAF0F8] text-[#023E8A]">{specialtyLabel(s)}</span>
                  ))}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mt-4">
                {clinic.address && (
                  <p className="flex items-center gap-2 text-sm text-[#64748B]">
                    <MapPin size={14} className="shrink-0 text-[#0077B6]" /> {formatAddress(clinic.address)}
                  </p>
                )}
                {clinic.phone && (
                  <p className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Phone size={14} className="shrink-0 text-[#0077B6]" /> {clinic.phone}
                  </p>
                )}
                {clinic.hours && (
                  <p className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Clock size={14} className="shrink-0 text-[#0077B6]" /> {clinic.hours}
                  </p>
                )}
                {clinic.website && (
                  <p className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Globe size={14} className="shrink-0 text-[#0077B6]" />
                    <a href={clinic.website.startsWith('http') ? clinic.website : `https://${clinic.website}`}
                      target="_blank" rel="noreferrer" className="text-[#0077B6] hover:underline truncate">
                      {clinic.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <Link to={`/agendar/qualquer?clinicId=${clinic.id}`}>
                <Button variant="outline" className="gap-2 whitespace-nowrap">
                  <Shuffle size={15} /> Sem preferência de profissional
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Date picker + professionals with slots */}
        <div className="grid lg:grid-cols-[auto_1fr] gap-6 items-start">

          {/* Calendar */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm lg:sticky lg:top-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-[#0077B6]" />
              <h2 className="font-bold text-[#03045E]">Escolha uma data</h2>
            </div>
            <CalendarPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={{ before: today }}
              className="rounded-2xl"
            />
            {selectedDate && (
              <p className="mt-3 text-sm text-center text-[#64748B] capitalize">
                {formatDateLong(selectedDate)}
              </p>
            )}
          </div>

          {/* Professionals */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#CAF0F8] flex items-center justify-center shrink-0">
                <Users size={18} className="text-[#0077B6]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#03045E]">Profissionais</h2>
                <p className="text-sm text-[#64748B]">
                  {selectedDate
                    ? `Horários disponíveis em ${formatDateLong(selectedDate)}`
                    : 'Selecione uma data para ver os horários disponíveis'}
                </p>
              </div>
            </div>

            {professionals.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-3xl p-10 text-center">
                <Stethoscope size={32} className="text-[#94A3B8] mx-auto mb-3" />
                <p className="font-bold text-[#03045E]">Nenhum profissional cadastrado</p>
                <p className="text-sm text-[#64748B] mt-1 mb-4">Agende sem especificar um profissional.</p>
                <Link to={`/agendar/qualquer?clinicId=${clinic.id}`}>
                  <Button variant="primary" className="gap-2">
                    <Calendar size={15} /> Agendar sem preferência
                  </Button>
                </Link>
              </div>
            ) : (
              professionals.map((pro) => (
                <ProfessionalCard
                  key={pro.id}
                  pro={pro}
                  clinicName={clinic.name}
                  selectedDate={selectedDate}
                  slots={slotsMap[pro.id] ?? null}
                  slotsLoading={slotsLoading}
                  onSlotClick={(slot) => handleSlotClick(pro, slot)}
                  onBookDirect={() => navigate(`/agendar/${pro.id}?clinicId=${clinicId}`)}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

interface ProfessionalCardProps {
  pro: any;
  clinicName: string;
  selectedDate: Date | undefined;
  slots: Slot[] | null;
  slotsLoading: boolean;
  onSlotClick: (slot: Slot) => void;
  onBookDirect: () => void;
}

function ProfessionalCard({ pro, clinicName, selectedDate, slots, slotsLoading, onSlotClick, onBookDirect }: ProfessionalCardProps) {
  const initials = (pro.name ?? '??').replace(/^(Dr\.|Dra\.)\s*/i, '').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const availableSlots = (slots ?? []).filter((s) => s.available);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 transition-all">
      {/* Professional header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#90E0EF] to-[#00B4D8] flex items-center justify-center shrink-0 text-white font-bold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#03045E]">{pro.name}</h3>
          <p className="text-sm font-semibold text-[#0077B6]">{specialtyLabel(pro.specialty)}</p>
          {pro.city && (
            <p className="text-xs text-[#64748B] mt-0.5 flex items-center gap-1">
              <MapPin size={11} /> {pro.city}
            </p>
          )}
        </div>
        {!selectedDate && (
          <button
            onClick={onBookDirect}
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] hover:text-[#023E8A] px-4 py-2 rounded-xl border border-[#E2E8F0] hover:border-[#00B4D8] hover:bg-[#F0FBFF] transition-colors"
          >
            <Calendar size={14} /> Agendar <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Slots section */}
      {selectedDate && (
        <div className="border-t border-[#E2E8F0] pt-4">
          {slotsLoading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-[#F1F5F9] animate-pulse" />
              ))}
            </div>
          ) : slots === null || slots.length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-3">Nenhum horário disponível nesta data.</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-3">Todos os horários estão ocupados nesta data.</p>
          ) : (
            <>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">
                {availableSlots.length} horário{availableSlots.length !== 1 ? 's' : ''} disponíve{availableSlots.length !== 1 ? 'is' : 'l'}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    disabled={!s.available}
                    onClick={() => s.available && onSlotClick(s)}
                    className={`h-10 rounded-xl text-sm font-semibold transition-colors border ${
                      !s.available
                        ? 'bg-[#F1F5F9] text-[#CBD5E1] border-[#E2E8F0] cursor-not-allowed line-through'
                        : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#00B4D8] hover:bg-[#023E8A] hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
