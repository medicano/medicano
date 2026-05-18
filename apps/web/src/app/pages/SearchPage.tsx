import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Search, MapPin, Phone, ChevronDown, Building2, SearchX, Calendar } from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';

type ResultType = 'all' | 'clinics' | 'professionals';

interface ClinicResult {
  kind: 'clinic';
  id: string;
  name: string;
  specialties: string[];
  city: string;
  phone: string;
}

interface ProfessionalResult {
  kind: 'professional';
  id: string;
  name: string;
  specialty: string;
  clinicId: string;
  clinicName: string;
  city: string;
}

type Result = ClinicResult | ProfessionalResult;

const SPECIALTIES: { label: string; value: string }[] = [
  { label: 'Medicina', value: 'medicine' },
  { label: 'Psicologia', value: 'psychology' },
  { label: 'Psiquiatria', value: 'psychiatry' },
  { label: 'Odontologia', value: 'dentistry' },
  { label: 'Nutrição', value: 'nutrition' },
];

const SPECIALTY_LABELS: Record<string, string> = Object.fromEntries(
  SPECIALTIES.map(({ value, label }) => [value, label])
);

function normalizeProfessional(p: any): ProfessionalResult {
  return {
    kind: 'professional',
    id: p.id ?? p._id,
    name: p.name ?? 'Profissional',
    specialty: p.specialty ?? '',
    clinicId: p.clinicId ?? '',
    clinicName: p.clinicName ?? p.clinic?.name ?? '',
    city: p.city ?? p.address?.city ?? '',
  };
}

function normalizeClinic(c: any): ClinicResult {
  return {
    kind: 'clinic',
    id: c.id ?? c._id,
    name: c.name ?? 'Clínica',
    specialties: Array.isArray(c.specialties) ? c.specialties : [],
    city: c.city ?? c.address?.city ?? '',
    phone: c.phone ?? '',
  };
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialSpecialty = searchParams.get('especialidade') ?? '';

  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [city, setCity] = useState('');
  const [type, setType] = useState<ResultType>('all');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submittedFilters, setSubmittedFilters] = useState({ query: '', specialty: initialSpecialty, city: '', type: 'all' as ResultType });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    if (submittedFilters.query) params.name = submittedFilters.query;
    if (submittedFilters.specialty) params.specialty = submittedFilters.specialty;
    if (submittedFilters.city) params.city = submittedFilters.city;
    if (submittedFilters.type !== 'all') params.type = submittedFilters.type === 'clinics' ? 'clinic' : 'professional';

    api.get('/search', { params })
      .then(({ data }) => {
        if (cancelled) return;
        const clinics: Result[] = (Array.isArray(data?.clinics) ? data.clinics : []).map(normalizeClinic);
        const professionals: Result[] = (Array.isArray(data?.professionals) ? data.professionals : []).map(normalizeProfessional);
        setResults([...clinics, ...professionals]);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.response?.data?.message || err?.message || 'Erro ao buscar profissionais.';
        setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
        setResults([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [submittedFilters]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedFilters({ query, specialty, city, type });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PatientTopbar />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Encontre clínicas e profissionais</h1>
          <p className="text-[#64748B] mt-1">Busque pelo nome, especialidade ou cidade.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm mb-8"
        >
          <div className="relative mb-4">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome de clínica, profissional ou especialidade..."
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:bg-white transition-colors"
            />
          </div>

          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Especialidade</label>
              <div className="relative">
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] appearance-none focus:outline-none focus:border-[#00B4D8] transition-colors"
                >
                  <option value="">Todas</option>
                  {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Cidade</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex.: São Paulo"
                  className="w-full h-11 pl-9 pr-4 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] transition-colors"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="gap-2 h-11">
              <Search size={18} /> Buscar
            </Button>
          </div>

          <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
            <div className="inline-flex p-1 bg-[#F1F5F9] rounded-xl">
              {([
                { key: 'all', label: 'Todos' },
                { key: 'clinics', label: 'Clínicas' },
                { key: 'professionals', label: 'Profissionais' },
              ] as { key: ResultType; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setType(opt.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    type === opt.key
                      ? 'bg-white text-[#023E8A] shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[#64748B]">
            {loading ? 'Buscando resultados...' : (
              <><span className="font-bold text-[#0F172A]">{results.length}</span> {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}</>
            )}
          </p>
        </div>
        {error && !loading && (
          <div className="mb-4 px-4 py-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-sm text-[#B91C1C]">{error}</div>
        )}

        {loading ? (
          <div className="grid gap-4">
            {[0, 1, 2, 3].map((i) => <ResultSkeleton key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4">
            {results.map((r) =>
              r.kind === 'clinic' ? <ClinicCard key={r.id} clinic={r} /> : <ProfessionalCard key={r.id} pro={r} />
            )}
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

function ClinicCard({ clinic }: { clinic: ClinicResult }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:border-[#00B4D8] hover:shadow-md transition-all">
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#48CAE4] to-[#0077B6] flex items-center justify-center shrink-0">
          <Building2 size={28} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-[#03045E]">{clinic.name}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {clinic.specialties.map((s) => (
              <span key={s} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#CAF0F8] text-[#023E8A]">
                {SPECIALTY_LABELS[s] ?? s}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-[#64748B]">
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {clinic.city}</span>
            <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {clinic.phone}</span>
          </div>
        </div>
        <div className="shrink-0">
          <Link to={`/clinica/${clinic.id}`}>
            <Button variant="secondary">Ver clínica</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProfessionalCard({ pro }: { pro: ProfessionalResult }) {
  const initials = pro.name.replace(/^(Dr\.|Dra\.)\s*/, '').split(' ').map((p) => p[0]).slice(0, 2).join('');
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:border-[#00B4D8] hover:shadow-md transition-all">
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#90E0EF] to-[#00B4D8] flex items-center justify-center shrink-0 text-white font-bold text-lg">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-[#03045E]">{pro.name}</h3>
          <p className="text-sm font-semibold text-[#0077B6] mt-1">{SPECIALTY_LABELS[pro.specialty] ?? pro.specialty}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-[#64748B]">
            <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {pro.clinicName}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {pro.city}</span>
          </div>
        </div>
        <div className="shrink-0">
          <Link to={`/agendar/${pro.id}${pro.clinicId ? `?clinicId=${pro.clinicId}` : ''}`}>
            <Button variant="primary" className="gap-2">
              <Calendar size={16} /> Agendar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#E2E8F0] shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-[#E2E8F0] rounded w-1/3" />
          <div className="flex gap-2">
            <div className="h-6 bg-[#E2E8F0] rounded-full w-20" />
            <div className="h-6 bg-[#E2E8F0] rounded-full w-24" />
          </div>
          <div className="h-4 bg-[#E2E8F0] rounded w-1/2" />
        </div>
        <div className="h-11 w-32 bg-[#E2E8F0] rounded-xl shrink-0" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
      <div className="w-20 h-20 rounded-3xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-6">
        <SearchX size={36} className="text-[#0077B6]" />
      </div>
      <h2 className="text-2xl font-bold text-[#03045E]">Nenhum resultado encontrado</h2>
      <p className="text-[#64748B] mt-2 max-w-md mx-auto">
        Tente ajustar os filtros ou buscar por outro termo. Você também pode iniciar a triagem para receber recomendações.
      </p>
    </div>
  );
}
