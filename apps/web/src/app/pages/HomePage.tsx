import React from 'react';
import { Link } from 'react-router';
import { Search, MessageSquareHeart, CalendarClock, ArrowRight, Calendar, Clock, Stethoscope, Building2, Heart, Brain, Smile, Apple, Activity } from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { Button } from '../components/ui/Button';
import { StatusBadge, type AppointmentStatus } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useApi, extractList } from '../lib/hooks';
import { mapStatus, formatDateShort, formatSlot } from '../lib/format';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';

interface UpcomingAppt {
  id: string;
  professionalName: string;
  specialty: string;
  clinicName: string;
  dateLabel: string;
  slot: string;
  status: AppointmentStatus;
}

const specialtiesList = [
  { name: 'Medicina', value: 'medicine', icon: Activity, color: 'from-[#48CAE4] to-[#0077B6]' },
  { name: 'Psicologia', value: 'psychology', icon: Brain, color: 'from-[#90E0EF] to-[#00B4D8]' },
  { name: 'Psiquiatria', value: 'psychiatry', icon: Heart, color: 'from-[#48CAE4] to-[#023E8A]' },
  { name: 'Odontologia', value: 'dentistry', icon: Smile, color: 'from-[#90E0EF] to-[#0077B6]' },
  { name: 'Nutrição', value: 'nutrition', icon: Apple, color: 'from-[#CAF0F8] to-[#00B4D8]' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function HomePage() {
  const { user } = useAuth();
  const userName = (user?.name ?? '').split(' ')[0] || 'paciente';

  const apptApi = useApi<any>('/appointments?upcoming=true');
  const recsApi = useApi<any>('/search');

  const upcoming: UpcomingAppt[] = extractList(apptApi.data).slice(0, 2).map((a: any) => ({
    id: a.id,
    professionalName: a.professional?.name ?? a.professionalName ?? 'Profissional',
    specialty: a.professional?.specialty ?? a.specialty ?? '',
    clinicName: a.clinic?.name ?? a.clinicName ?? '',
    dateLabel: formatDateShort(a.startAt ?? a.start_at ?? a.date),
    slot: formatSlot(a.startAt ?? a.start_at ?? a.date),
    status: mapStatus(a.status),
  }));

  const professionals = Array.isArray(recsApi.data?.professionals) ? recsApi.data.professionals : extractList(recsApi.data);
  const recommendations = professionals.slice(0, 3).map((p: any) => ({
    id: p.id,
    name: p.name,
    specialty: p.specialty ?? p.specialties?.[0] ?? '',
    clinicName: p.clinic?.name ?? p.clinicName ?? '',
    city: p.city ?? p.clinic?.city ?? '',
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PatientTopbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-8 py-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#023E8A] via-[#0077B6] to-[#00B4D8] p-10 mb-10">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-60 h-60 rounded-full bg-[#90E0EF]/20 blur-3xl" />
          <div className="relative">
            <p className="text-[#CAF0F8] text-sm font-semibold tracking-wide uppercase">{greeting()}</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mt-1">
              Olá, {userName}!
            </h1>
            <p className="text-white/80 mt-3 max-w-xl">
              Como você está se sentindo hoje? Use a triagem inteligente para receber recomendações personalizadas ou agende diretamente.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/triage">
                <Button variant="primary" className="gap-2">
                  <MessageSquareHeart size={18} /> Iniciar triagem
                </Button>
              </Link>
              <Link to="/search">
                <Button variant="outline" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white hover:text-[#023E8A]">
                  <Search size={18} /> Buscar profissional
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4 mb-12">
          <QuickAction
            to="/triage"
            icon={<MessageSquareHeart size={22} />}
            title="Triagem inteligente"
            description="Receba recomendações com base nos seus sintomas."
            accent="from-[#48CAE4] to-[#0077B6]"
          />
          <QuickAction
            to="/search"
            icon={<Search size={22} />}
            title="Buscar atendimento"
            description="Encontre clínicas e profissionais por especialidade."
            accent="from-[#90E0EF] to-[#00B4D8]"
          />
          <QuickAction
            to="/appointments"
            icon={<CalendarClock size={22} />}
            title="Meus agendamentos"
            description="Acompanhe seus atendimentos agendados."
            accent="from-[#48CAE4] to-[#023E8A]"
          />
        </section>

        <section className="mb-12">
          <SectionHeader title="Próximos agendamentos" linkLabel="Ver todos" to="/appointments" />
          {upcoming.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-4">
                <CalendarClock size={28} className="text-[#0077B6]" />
              </div>
              <h3 className="text-lg font-bold text-[#03045E]">Nenhum agendamento por aqui</h3>
              <p className="text-sm text-[#64748B] mt-1">Que tal iniciar uma triagem para encontrar o melhor atendimento?</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {upcoming.map((a) => <UpcomingCard key={a.id} appt={a} />)}
            </div>
          )}
        </section>

        <section className="mb-12">
          <SectionHeader title="Especialidades" linkLabel="Ver todas" to="/search" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {specialtiesList.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.name}
                  to={`/search?especialidade=${s.value}`}
                  className="group bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#00B4D8] hover:shadow-md transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <p className="font-semibold text-[#03045E] group-hover:text-[#0077B6] transition-colors">{s.name}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mb-4">
          <SectionHeader title="Recomendados para você" linkLabel="Ver todos" to="/search" />
          <div className="grid md:grid-cols-3 gap-4">
            {recommendations.map((r) => {
              const initials = r.name.replace(/^(Dr\.|Dra\.)\s*/, '').split(' ').map((p) => p[0]).slice(0, 2).join('');
              return (
                <div key={r.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#00B4D8] hover:shadow-md transition-all flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#90E0EF] to-[#00B4D8] flex items-center justify-center text-white font-bold">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#03045E] truncate">{r.name}</p>
                      <p className="text-xs font-semibold text-[#0077B6]">{SPECIALTY_LABELS[r.specialty] ?? r.specialty}</p>
                    </div>
                  </div>
                  <div className="text-sm text-[#64748B] space-y-1 mb-4 flex-1">
                    <p className="inline-flex items-center gap-1.5"><Building2 size={14} /> {r.clinicName}</p>
                    <p className="inline-flex items-center gap-1.5"><Stethoscope size={14} /> {r.city}</p>
                  </div>
                  <Link to={`/book/${r.id}`}>
                    <Button variant="primary" className="w-full gap-2">
                      <Calendar size={16} /> Agendar
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

function QuickAction({ to, icon, title, description, accent }: { to: string; icon: React.ReactNode; title: string; description: string; accent: string }) {
  return (
    <Link
      to={to}
      className="group bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#00B4D8] hover:shadow-md transition-all flex items-start gap-4"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-[#03045E]">{title}</h3>
          <ArrowRight size={16} className="text-[#94A3B8] group-hover:text-[#0077B6] group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className="text-sm text-[#64748B] mt-1">{description}</p>
      </div>
    </Link>
  );
}

function SectionHeader({ title, linkLabel, to }: { title: string; linkLabel: string; to: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="text-2xl font-extrabold text-[#03045E] tracking-tight">{title}</h2>
      <Link to={to} className="text-sm font-semibold text-[#0077B6] hover:text-[#023E8A] inline-flex items-center gap-1">
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function UpcomingCard({ appt }: { appt: UpcomingAppt }) {
  const initials = appt.professionalName.replace(/^(Dr\.|Dra\.)\s*/, '').split(' ').map((p) => p[0]).slice(0, 2).join('');
  return (
    <Link
      to={`/appointments/${appt.id}`}
      className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#00B4D8] hover:shadow-md transition-all block"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#90E0EF] to-[#00B4D8] flex items-center justify-center text-white font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-[#03045E] truncate">{appt.professionalName}</p>
              <p className="text-xs font-semibold text-[#0077B6]">{SPECIALTY_LABELS[appt.specialty] ?? appt.specialty}</p>
            </div>
            <StatusBadge status={appt.status} />
          </div>
          <div className="text-sm text-[#64748B] mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {appt.dateLabel}</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {appt.slot}</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-2 inline-flex items-center gap-1.5">
            <Building2 size={12} /> {appt.clinicName}
          </p>
        </div>
      </div>
    </Link>
  );
}
