import React from 'react';
import { 
  CheckCircle2, 
  Activity, 
  HeartHandshake, 
  Sparkles, 
  Stethoscope,
  Building2,
  User,
  Headset,
  CalendarCheck2,
  MessageSquare
} from 'lucide-react';

export function Presentation() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-24">
      {/* Header */}
      <header className="bg-[#03045E] text-white py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CAF0F8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00B4D8]/20 text-[#CAF0F8] rounded-full text-sm font-medium mb-6">
            <Sparkles size={16} />
            <span>Fase 1: Contexto e Identidade Visual</span>
          </div>
          <h1 className="text-white mb-4">Bem-vindo(a) ao Medicano</h1>
          <p className="text-xl text-[#ADE8F4] max-w-2xl font-light">
            Plataforma brasileira de agendamento de saúde com triagem inteligente.
            Abaixo, confirmo meu entendimento do seu projeto e apresento as direções de logotipo.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 -mt-8 relative z-20 space-y-12">
        
        {/* Entendimento Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0077B6]">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="!text-[#03045E] !mb-1">Validação de Contexto</h2>
              <p className="text-[#64748B]">Confirmação das regras de negócio do Medicano</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 1. Profiles */}
            <div className="space-y-4">
              <h3 className="text-[#0096C7] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#CAF0F8] text-[#0077B6] flex items-center justify-center text-sm font-bold">1</span>
                Perfis de Usuário
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <User className="text-[#10B981] mt-1 shrink-0" size={18} />
                  <div>
                    <strong className="block text-[#0F172A]">Paciente</strong>
                    <span className="text-sm text-[#64748B]">Busca profissionais, passa por triagem com o chatbot e agenda atendimentos. Não possui assinatura.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Building2 className="text-[#10B981] mt-1 shrink-0" size={18} />
                  <div>
                    <strong className="block text-[#0F172A]">Clínica (PJ)</strong>
                    <span className="text-sm text-[#64748B]">Assinante do plano grupo. Gerencia múltiplos profissionais, configurações de agenda e possui atendentes vinculados.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Stethoscope className="text-[#10B981] mt-1 shrink-0" size={18} />
                  <div>
                    <strong className="block text-[#0F172A]">Autônomo</strong>
                    <span className="text-sm text-[#64748B]">Profissional independente com assinatura individual. Gerencia a própria agenda, não possui funcionários.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Headset className="text-[#10B981] mt-1 shrink-0" size={18} />
                  <div>
                    <strong className="block text-[#0F172A]">Atendente</strong>
                    <span className="text-sm text-[#64748B]">Vinculado à clínica. Acesso restrito para visualizar agendas e gerenciar agendamentos no dia a dia.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="space-y-8">
              {/* 2. Flow */}
              <div className="space-y-4">
                <h3 className="text-[#0096C7] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#CAF0F8] text-[#0077B6] flex items-center justify-center text-sm font-bold">2</span>
                  Fluxo Principal
                </h3>
                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#023E8A] text-white flex items-center justify-center"><MessageSquare size={18} /></div>
                    <span className="text-xs font-semibold">Triagem IA</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-2"></div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#0077B6] text-white flex items-center justify-center"><User size={18} /></div>
                    <span className="text-xs font-semibold">Busca Filtrada</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-2"></div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center"><CalendarCheck2 size={18} /></div>
                    <span className="text-xs font-semibold">Agendamento</span>
                  </div>
                </div>
              </div>

              {/* 3. Status */}
              <div className="space-y-4">
                <h3 className="text-[#0096C7] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#CAF0F8] text-[#0077B6] flex items-center justify-center text-sm font-bold">3</span>
                  Status de Agendamento
                </h3>
                <div className="flex flex-wrap gap-3">
                  <div className="px-3 py-1.5 bg-[#FEF3C7] text-[#B45309] rounded-full text-sm font-medium border border-[#FDE68A]">
                    Pendente (Aguardando confirmação)
                  </div>
                  <div className="px-3 py-1.5 bg-[#D1FAE5] text-[#047857] rounded-full text-sm font-medium border border-[#A7F3D0]">
                    Confirmado (Agendado com sucesso)
                  </div>
                  <div className="px-3 py-1.5 bg-[#FEE2E2] text-[#B91C1C] rounded-full text-sm font-medium border border-[#FECACA]">
                    Cancelado (Pelo paciente ou clínica)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="space-y-8">
          <div>
            <h2 className="!mb-2">Propostas de Logotipo</h2>
            <p className="text-[#64748B]">Quatro direções baseadas nas referências modernas, acolhedoras e na paleta de cores (Azul + Turquesa).</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Opção 1: Símbolo abstrato + nome */}
            <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] hover:border-[#00B4D8] transition-colors group cursor-pointer shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#023E8A] to-[#00B4D8] rounded-xl flex items-center justify-center text-white shadow-md">
                  <Activity size={28} strokeWidth={2.5} />
                </div>
                <span className="text-3xl font-bold tracking-tight text-[#03045E]">Medicano</span>
              </div>
              <h4 className="text-[#023E8A] mb-2">1. Símbolo Abstrato + Nome</h4>
              <p className="text-sm text-[#64748B]">Onda de frequência suave conectada ao nome. Transmite tecnologia, fluidez e saúde sem ser literal demais.</p>
            </div>

            {/* Opção 2: Tipográfico */}
            <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] hover:border-[#00B4D8] transition-colors group cursor-pointer shadow-sm flex flex-col justify-center">
              <div className="mb-6 flex items-center">
                <span className="text-4xl font-extrabold tracking-tighter text-[#03045E]">
                  medi<span className="text-[#00B4D8]">cano</span><span className="text-[#10B981]">.</span>
                </span>
              </div>
              <h4 className="text-[#023E8A] mb-2">2. Apenas Tipográfico (Wordmark)</h4>
              <p className="text-sm text-[#64748B]">Forte, moderno e confiável. O uso do ponto verde finaliza a marca com um toque de ação ("resolvido"). Inspirado em startups contemporâneas.</p>
            </div>

            {/* Opção 3: Monograma */}
            <div className="bg-[#03045E] p-8 rounded-2xl border border-[#023E8A] hover:border-[#48CAE4] transition-colors group cursor-pointer shadow-sm text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#00B4D8]">
                    <path d="M4 20L10 4L14 14L20 4" />
                  </svg>
                </div>
                <span className="text-3xl font-bold tracking-tight text-white">Medicano</span>
              </div>
              <h4 className="text-[#ADE8F4] mb-2">3. Monograma Estilizado (M)</h4>
              <p className="text-sm text-[#CAF0F8]/80">A letra 'M' desenhada como uma linha contínua ou pulso vital. Minimalista e com alta legibilidade em formatos pequenos (como favicon ou app).</p>
            </div>

            {/* Opção 4: Ícone com metáfora sutil */}
            <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] hover:border-[#10B981] transition-colors group cursor-pointer shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-[#E0F2FE] rounded-2xl flex items-center justify-center text-[#0096C7]">
                  <HeartHandshake size={28} strokeWidth={2} />
                </div>
                <span className="text-3xl font-bold tracking-tight text-[#0F172A]">Medicano</span>
              </div>
              <h4 className="text-[#0096C7] mb-2">4. Metáfora de Cuidado (Acolhedor)</h4>
              <p className="text-sm text-[#64748B]">O ícone de união (coração/mãos) foge dos clichês de saúde (cruz, escudo) e foca na conexão humana entre profissional e paciente. Muito acolhedor.</p>
            </div>

          </div>

          <div className="mt-8 bg-[#CAF0F8] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-[#023E8A] mb-1">Qual direção visual você prefere?</h4>
              <p className="text-sm text-[#0077B6]">Me diga no chat qual opção seguir (1 a 4). Com isso, darei início imediato à construção da Landing Page.</p>
            </div>
            <div className="shrink-0 flex gap-2">
              {[1, 2, 3, 4].map(num => (
                <div key={num} className="w-10 h-10 rounded-full bg-white border border-[#48CAE4] flex items-center justify-center text-[#023E8A] font-bold shadow-sm">
                  {num}
                </div>
              ))}
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
