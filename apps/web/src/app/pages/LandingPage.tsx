import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  Bot,
  Search,
  CalendarCheck2,
  Stethoscope,
  Brain,
  Heart,
  Smile,
  Apple,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Star,
  PlayCircle,
  Activity,
  XCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MedicanoLogo } from '../components/MedicanoLogo';

export function LandingPage() {
  const [audience, setAudience] = useState<'paciente' | 'profissional'>('paciente');

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white selection:bg-[#90E0EF] selection:text-[#03045E]">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          <MedicanoLogo />
          
          <div className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-[#64748B]">
            <a href="#como-funciona" className="hover:text-[#0077B6] transition-colors">Como funciona</a>
            <a href="#especialidades" className="hover:text-[#0077B6] transition-colors">Especialidades</a>
            <a href="#profissionais" className="hover:text-[#0077B6] transition-colors">Para Profissionais</a>
            <a href="#planos" className="hover:text-[#0077B6] transition-colors">Planos</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="hidden md:inline-flex">Entrar</Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" className="gap-2">
                Agendar consulta <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        
        {/* HERO SECTION */}
        <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-28 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-[#F8FAFC] to-white">
          {/* Background Decorative */}
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-[#CAF0F8] rounded-full opacity-40 blur-3xl pointer-events-none"></div>
          
          <div className="max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
            
            {/* Hero Content */}
            <div className="space-y-8 max-w-2xl">
              
              {/* Audience Toggle */}
              <div className="inline-flex items-center p-1 bg-[#E2E8F0] rounded-xl">
                <button 
                  onClick={() => setAudience('paciente')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    audience === 'paciente' 
                      ? 'bg-white text-[#03045E] shadow-sm' 
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Sou paciente
                </button>
                <button 
                  onClick={() => setAudience('profissional')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    audience === 'profissional' 
                      ? 'bg-white text-[#03045E] shadow-sm' 
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Sou profissional
                </button>
              </div>

              {/* Dynamic Headline & Sub */}
              <div className="space-y-6 min-h-[160px] flex flex-col justify-center">
                {audience === 'paciente' ? (
                  <>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#03045E] leading-[1.1] tracking-tight">
                      Sua próxima consulta a <span className="text-[#00B4D8]">poucos cliques.</span>
                    </h1>
                    <p className="text-lg text-[#64748B] leading-relaxed max-w-xl">
                      Encontre profissionais de saúde, escolha o horário e agende online — sem ligações, sem espera. Tudo com confirmação imediata e lembretes pelo WhatsApp.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#03045E] leading-[1.1] tracking-tight">
                      Mais tempo cuidando.<br/><span className="text-[#0077B6]">Menos no telefone.</span>
                    </h1>
                    <p className="text-lg text-[#64748B] leading-relaxed max-w-xl">
                      Automatize o atendimento e os agendamentos da sua clínica. Atraia os pacientes certos e dedique sua energia a quem realmente precisa de você.
                    </p>
                  </>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {audience === 'paciente' ? (
                  <>
                    <Link to="/signup">
                      <Button variant="primary" size="lg" className="gap-2 w-full sm:w-auto">
                        <CalendarCheck2 size={20} />
                        Criar conta e agendar
                      </Button>
                    </Link>
                    <Link to="/assistant">
                      <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                        <Bot size={20} />
                        Assistente por IA (opcional)
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/signup">
                      <Button variant="primary" size="lg" className="gap-2 w-full sm:w-auto">
                        Cadastrar minha clínica
                      </Button>
                    </Link>
                    <a href="#planos">
                      <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                        Ver planos e preços
                      </Button>
                    </a>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-6 pt-4 text-sm text-[#64748B]">
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#10B981]" /> Mais de 10k agendamentos</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#10B981]" /> Profissionais verificados</div>
              </div>
            </div>

            {/* Hero Visual - Abstract Illustrations */}
            <div className="relative lg:h-[600px] flex items-center justify-center">
              {audience === 'paciente' ? (
                /* Patient Illustration */
                <div className="relative w-full max-w-[500px] aspect-[4/5] rounded-[2rem] bg-gradient-to-br from-[#CAF0F8]/40 to-[#E0F2FE]/40 overflow-hidden shadow-sm border border-[#E2E8F0] flex items-center justify-center transition-all duration-700 animate-in fade-in zoom-in-95">
                  {/* Soft Background Blobs */}
                  <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#00B4D8]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                  <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#10B981]/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
                  
                  {/* Composition — appointment-first */}
                  <div className="relative z-10 w-[88%] bg-white rounded-[2rem] shadow-xl shadow-[#03045E]/5 border border-[#E2E8F0]/60 p-6 rotate-1">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-xs font-bold tracking-wider text-[#64748B] uppercase">Próxima consulta</p>
                        <p className="text-2xl font-extrabold text-[#03045E] mt-1">Qui, 24 abr · 09:00</p>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
                        <CalendarCheck2 size={22} />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { t: '08:00', d: 'Livre', on: false },
                        { t: '09:00', d: 'Dr. Ricardo · Cardiologia', on: true },
                        { t: '10:30', d: 'Livre', on: false },
                      ].map((s, i) => (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${s.on ? 'bg-[#CAF0F8]/40 border-[#90E0EF]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
                          <span className="text-sm font-bold text-[#03045E] w-12">{s.t}</span>
                          <span className={`text-sm flex-1 ${s.on ? 'font-semibold text-[#0F172A]' : 'text-[#94A3B8]'}`}>{s.d}</span>
                          {s.on && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#A7F3D0] text-[#065F46]">Confirmado</span>}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <Bot size={14} className="text-[#64748B]" />
                      <span className="text-xs text-[#64748B]">Assistente por IA disponível, se precisar.</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Professional Illustration */
                <div className="relative w-full max-w-[500px] aspect-[4/5] rounded-[2rem] bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] overflow-hidden shadow-sm border border-[#E2E8F0] flex items-center justify-center transition-all duration-700 animate-in fade-in zoom-in-95">
                  {/* Soft Background Blobs */}
                  <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-[#023E8A]/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>
                  <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#00B4D8]/15 rounded-full blur-3xl translate-y-1/3 translate-x-1/3"></div>
                  
                  {/* Composition */}
                  <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="flex items-end gap-5">
                      <div className="w-16 h-20 bg-white rounded-2xl shadow-lg shadow-[#03045E]/5 flex items-center justify-center border border-[#E2E8F0]/50">
                        <Activity className="w-7 h-7 text-[#00B4D8]" strokeWidth={2} />
                      </div>
                      <div className="w-40 h-48 bg-white rounded-[2rem] shadow-xl shadow-[#03045E]/5 flex items-center justify-center rotate-3 border border-[#E2E8F0]/50 backdrop-blur-sm">
                        <CalendarCheck2 className="w-16 h-16 text-[#023E8A]" strokeWidth={1.5} />
                      </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-[#10B981] rounded-2xl shadow-lg shadow-[#10B981]/20 flex items-center gap-3 -rotate-2">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <div className="w-20 h-2 bg-white/40 rounded-full"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* STATS / HOOK SECTION */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-[#F8FAFC]">
          <div className="max-w-[1440px] mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#023E8A] rounded-3xl p-10 text-center shadow-lg shadow-[#023E8A]/10 border border-[#0077B6]/20">
                <p className="text-5xl font-black text-white mb-3">+10k</p>
                <p className="text-[#ADE8F4] text-[15px] leading-relaxed">consultas agendadas online com confirmação imediata.</p>
              </div>
              <div className="bg-[#023E8A] rounded-3xl p-10 text-center shadow-lg shadow-[#023E8A]/10 border border-[#0077B6]/20">
                <p className="text-5xl font-black text-[#10B981] mb-3">2 min</p>
                <p className="text-[#ADE8F4] text-[15px] leading-relaxed">é o tempo médio para escolher horário e fechar o agendamento.</p>
              </div>
              <div className="bg-[#023E8A] rounded-3xl p-10 text-center shadow-lg shadow-[#023E8A]/10 border border-[#0077B6]/20">
                <p className="text-5xl font-black text-white mb-3">0</p>
                <p className="text-[#ADE8F4] text-[15px] leading-relaxed">ligações: lembretes e confirmações chegam direto pelo WhatsApp.</p>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA SECTION */}
        <section id="como-funciona" className="py-14 sm:py-24 px-4 sm:px-8 bg-white">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-bold text-[#03045E] mb-4">Agendar sua consulta em 4 passos</h2>
              <p className="text-[#64748B] text-lg">Um processo direto, online e sem ligações. Com assistente por IA opcional, se você precisar de ajuda.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-8 left-16 right-16 h-0.5 bg-gradient-to-r from-[#E2E8F0] via-[#00B4D8] to-[#E2E8F0] z-0"></div>

              {[
                {
                  icon: Search,
                  title: "1. Encontre o profissional",
                  desc: "Busque por especialidade, proximidade e preço. Veja apenas quem atende sua necessidade."
                },
                {
                  icon: CalendarCheck2,
                  title: "2. Escolha o horário",
                  desc: "Visualize a agenda em tempo real e selecione o slot que cabe na sua rotina."
                },
                {
                  icon: CheckCircle2,
                  title: "3. Confirmação imediata",
                  desc: "Receba a confirmação no ato e lembretes pelo WhatsApp antes da consulta."
                },
                {
                  icon: Bot,
                  title: "Opcional · Assistente por IA",
                  desc: "Em dúvida sobre a especialidade? Converse com a IA para uma indicação rápida."
                }
              ].map((step, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#E2E8F0] group-hover:border-[#00B4D8] flex items-center justify-center text-[#023E8A] mb-6 transition-colors shadow-sm">
                    <step.icon size={28} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A] mb-3">{step.title}</h3>
                  <p className="text-[#64748B] text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ESPECIALIDADES */}
        <section id="especialidades" className="py-14 sm:py-24 px-4 sm:px-8 bg-[#F8FAFC] border-y border-[#E2E8F0]">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="max-w-xl">
                <h2 className="text-4xl font-bold text-[#03045E] mb-4">Especialidades em destaque</h2>
                <p className="text-[#64748B] text-lg">Encontre profissionais qualificados nas áreas mais buscadas de saúde e bem-estar.</p>
              </div>
              <Button variant="outline" className="shrink-0 gap-2">
                Ver todas as especialidades <ArrowRight size={18} />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: Brain, name: "Psicologia", color: "text-[#00B4D8]", bg: "bg-[#CAF0F8]" },
                { icon: Stethoscope, name: "Clínica Médica", color: "text-[#023E8A]", bg: "bg-[#E0F2FE]" },
                { icon: Heart, name: "Cardiologia", color: "text-[#EF4444]", bg: "bg-[#FEE2E2]" },
                { icon: Smile, name: "Odontologia", color: "text-[#10B981]", bg: "bg-[#D1FAE5]" },
                { icon: Apple, name: "Nutrição", color: "text-[#F59E0B]", bg: "bg-[#FEF3C7]" }
              ].map((spec, i) => (
                <a key={i} href="#" className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#00B4D8] hover:shadow-md transition-all group">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${spec.bg} ${spec.color} group-hover:scale-110 transition-transform`}>
                    <spec.icon size={28} strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-[#0F172A]">{spec.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* PARA PROFISSIONAIS / B2B */}
        <section id="profissionais" className="py-14 sm:py-24 px-4 sm:px-8 bg-gradient-to-br from-[#CAF0F8]/40 via-[#E0F2FE]/30 to-white">
          <div className="max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-16 items-center">

            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 text-sm font-bold tracking-wider text-[#10B981] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Para profissionais
              </div>
              <h2 className="text-5xl font-extrabold text-[#03045E] leading-[1.05] tracking-tight">
                Sua agenda no<br/>piloto automático.
              </h2>
              <p className="text-lg text-[#64748B] leading-relaxed max-w-xl">
                Para psicólogos, nutricionistas, dentistas, médicos e clínicas. Deixe atendentes operarem a agenda enquanto você cuida de quem importa.
              </p>

              <ul className="space-y-4">
                {[
                  { b: "Agenda com slots configuráveis", r: "por dia e horário, com intervalo mínimo entre consultas." },
                  { b: "Confirmação automática ou manual,", r: "você escolhe o controle que faz sentido." },
                  { b: "Múltiplos atendentes", r: "com login próprio, sem acesso a configurações ou dados financeiros." },
                  { b: "Política de cancelamento", r: "com antecedência mínima definida por você (de 0 a 72h)." }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#0F172A]">
                    <CheckCircle2 className="text-[#10B981] shrink-0 mt-1" size={20} />
                    <span className="leading-relaxed"><span className="font-bold">{item.b}</span> {item.r}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link to="/signup">
                  <Button variant="primary" size="lg" className="gap-2 w-full sm:w-auto">
                    Cadastrar consultório <ArrowRight size={18} />
                  </Button>
                </Link>
                <a href="#planos">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Falar com vendas
                  </Button>
                </a>
              </div>
            </div>

            {/* Agenda Illustration */}
            <div className="relative">
              <div className="relative rounded-[2rem] bg-white border border-[#E2E8F0] shadow-xl shadow-[#03045E]/5 p-6 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-[#64748B] uppercase">Esta semana</p>
                    <p className="text-4xl font-extrabold text-[#03045E] mt-1">+24<br/><span className="text-2xl font-bold">consultas</span></p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
                    <CalendarCheck2 size={20} />
                  </div>
                </div>

                <p className="text-sm font-semibold text-[#64748B] mb-4">Quinta, 24 abr</p>

                {/* Timeline entries */}
                <div className="space-y-4 relative">
                  <div className="absolute left-[46px] top-2 bottom-2 w-px bg-[#E2E8F0]" />

                  {[
                    { time: "09:00", name: "Carla Mendes", tag: "Retorno", status: "confirmado", color: "bg-[#A7F3D0] text-[#065F46]" },
                    { time: "10:30", name: "Pedro Souza", tag: "Primeira consulta", status: "pendente", color: "bg-[#FEF3C7] text-[#92400E]" },
                    { time: "14:00", name: "Sem agendamento", tag: "Livre", status: "", color: "" },
                    { time: "15:30", name: "Ana Lúcia", tag: "Retorno", status: "confirmado", color: "bg-[#A7F3D0] text-[#065F46]" }
                  ].map((slot, i) => (
                    <div key={i} className="relative flex items-center gap-4">
                      <div className="w-12 text-sm font-bold text-[#03045E] shrink-0">{slot.time}</div>
                      <div className={`w-3 h-3 rounded-full shrink-0 z-10 ${slot.status ? 'bg-[#00B4D8]' : 'bg-[#E2E8F0]'} ring-4 ring-white`} />
                      <div className="flex-1 flex items-center justify-between gap-3 bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0]">
                        <div>
                          <p className={`text-sm font-bold ${slot.status ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>{slot.name}</p>
                          <p className="text-xs text-[#64748B]">{slot.tag}</p>
                        </div>
                        {slot.status && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${slot.color}`}>
                            {slot.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* PLANOS B2B */}
        <section id="planos" className="py-14 sm:py-24 px-4 sm:px-8 bg-white">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-bold text-[#03045E] mb-4">Planos que cabem no seu consultório</h2>
              <p className="text-[#64748B] text-lg">Escolha o plano ideal para o seu momento profissional. Sem surpresas.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Plano Individual */}
              <div className="bg-white rounded-3xl p-10 border border-[#E2E8F0] shadow-sm">
                <p className="text-xs font-bold tracking-widest text-[#00B4D8] uppercase mb-4">Individual</p>
                <div className="mb-2">
                  <span className="text-5xl font-black text-[#03045E]">R$ 89</span>
                  <span className="text-[#64748B] ml-1">/mês</span>
                </div>
                <p className="text-[#64748B] mb-8 leading-relaxed">
                  Para profissionais autônomos que gerenciam a própria agenda.
                </p>

                <ul className="space-y-3.5 mb-10">
                  {[
                    { text: "Perfil público com horários em tempo real", on: true },
                    { text: "Agenda com slots configuráveis", on: true },
                    { text: "Confirmação automática ou manual", on: true },
                    { text: "Política própria de cancelamento", on: true },
                    { text: "Upgrade para grupo a qualquer momento", on: true },
                    { text: "Atendentes dedicados", on: false },
                    { text: "Múltiplos profissionais", on: false }
                  ].map((item, i) => (
                    <li key={i} className={`flex items-start gap-3 text-sm ${item.on ? 'text-[#0F172A]' : 'text-[#CBD5E1]'}`}>
                      {item.on
                        ? <CheckCircle2 className="text-[#10B981] shrink-0 mt-0.5" size={18} />
                        : <XCircle className="text-[#CBD5E1] shrink-0 mt-0.5" size={18} />
                      }
                      {item.text}
                    </li>
                  ))}
                </ul>

                <Link to="/signup">
                  <Button variant="outline" className="w-full rounded-full">
                    Começar como individual
                  </Button>
                </Link>
              </div>

              {/* Plano Grupo */}
              <div className="bg-white rounded-3xl p-10 border-2 border-[#00B4D8] shadow-xl shadow-[#00B4D8]/10 relative">
                <div className="absolute -top-3 right-8 bg-[#00B4D8] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
                  Mais escolhido
                </div>
                <p className="text-xs font-bold tracking-widest text-[#10B981] uppercase mb-4">Grupo de saúde</p>
                <div className="mb-2">
                  <span className="text-5xl font-black text-[#03045E]">R$ 249</span>
                  <span className="text-[#64748B] ml-1">/mês por clínica</span>
                </div>
                <p className="text-[#64748B] mb-8 leading-relaxed">
                  Para clínicas com múltiplos profissionais e equipe administrativa.
                </p>

                <ul className="space-y-3.5 mb-10">
                  {[
                    "Tudo do plano individual",
                    "Múltiplos profissionais vinculados",
                    "Atendentes com login próprio (sem e-mail)",
                    "Agendamento sem escolher profissional específico",
                    "Conexão entre profissionais da clínica",
                    "Visão consolidada da agenda",
                    "Suporte prioritário"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#0F172A]">
                      <CheckCircle2 className="text-[#10B981] shrink-0 mt-0.5" size={18} />
                      {text}
                    </li>
                  ))}
                </ul>

                <Link to="/signup">
                  <Button variant="primary" className="w-full rounded-full">
                    Começar grupo de saúde
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#023E8A] pt-12 sm:pt-20 pb-8 sm:pb-10 px-4 sm:px-8">
        <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2 lg:col-span-2">
            <MedicanoLogo className="mb-6" inverted />
            <p className="text-[#ADE8F4] mb-6 max-w-sm leading-relaxed">
              Transformando a forma como brasileiros encontram, agendam e vivem suas jornadas de saúde.
            </p>
            <div className="flex gap-4">
              {/* Social icons placeholders */}
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00B4D8] transition-colors cursor-pointer"><Star size={18} /></div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00B4D8] transition-colors cursor-pointer"><Heart size={18} /></div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00B4D8] transition-colors cursor-pointer"><PlayCircle size={18} /></div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Para Pacientes</h4>
            <ul className="space-y-3 text-[#ADE8F4] text-sm">
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Buscar Médicos</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Especialidades</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Assistente por IA</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Ajuda</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Para Profissionais</h4>
            <ul className="space-y-3 text-[#ADE8F4] text-sm">
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Cadastrar Clínica</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Planos e Preços</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Blog e Materiais</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Central de Ajuda</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Institucional</h4>
            <ul className="space-y-3 text-[#ADE8F4] text-sm">
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Imprensa</a></li>
              <li><a href="#" className="hover:text-[#90E0EF] transition-colors">Contato</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#ADE8F4]">
          <p>© {new Date().getFullYear()} Medicano Saúde Inteligente LTDA. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#90E0EF] transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-[#90E0EF] transition-colors">Política de Privacidade (LGPD)</a>
            <span className="flex items-center gap-1 text-white"><ShieldCheck size={14} className="text-[#10B981]" /> Em conformidade com CFM</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
