import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { CheckCircle2, Calendar, Clock, User, Building2, Stethoscope } from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { Button } from '../components/ui/Button';

interface BookingSuccessState {
  professionalName?: string;
  specialty?: string;
  clinicName?: string;
  dateLabel?: string;
  slot?: string;
}

export function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as BookingSuccessState;

  const summary = {
    professionalName: state.professionalName ?? 'Profissional',
    specialty: state.specialty ?? 'Especialidade',
    clinicName: state.clinicName || '—',
    dateLabel: state.dateLabel ?? 'Data a confirmar',
    slot: state.slot ?? '--:--',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PatientTopbar />

      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-[560px]">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#10B981]/20 blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg">
                <CheckCircle2 size={56} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-[#03045E] tracking-tight">Consulta agendada!</h1>
            <p className="text-[#64748B] mt-3">
              Seu atendimento foi confirmado com sucesso. Você receberá um lembrete antes da consulta.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm mb-6">
            <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-4">Resumo</h2>
            <ul className="divide-y divide-[#E2E8F0]">
              <SummaryRow icon={<User size={16} />} label="Profissional" value={summary.professionalName} />
              <SummaryRow icon={<Stethoscope size={16} />} label="Especialidade" value={summary.specialty} />
              <SummaryRow icon={<Calendar size={16} />} label="Data" value={summary.dateLabel} capitalize />
              <SummaryRow icon={<Clock size={16} />} label="Horário" value={summary.slot} />
              <SummaryRow icon={<Building2 size={16} />} label="Clínica" value={summary.clinicName} />
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/appointments')}
              className="flex-1"
            >
              Ver meus agendamentos
            </Button>
            <Link to="/" className="flex-1">
              <Button variant="outline" className="w-full">
                Voltar ao início
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

function SummaryRow({ icon, label, value, capitalize }: { icon: React.ReactNode; label: string; value: string; capitalize?: boolean }) {
  return (
    <li className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div className="w-9 h-9 rounded-xl bg-[#CAF0F8] text-[#0077B6] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-semibold text-[#0F172A] truncate ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      </div>
    </li>
  );
}
