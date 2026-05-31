import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { MessageCircle, Plus, ChevronRight, Bot, Sparkles } from 'lucide-react';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { Button } from '../components/ui/Button';
import { useApi, extractList } from '../lib/hooks';
import { api } from '../lib/api';

export function TriageListPage() {
  const navigate = useNavigate();
  const sessionsApi = useApi<any[]>('/chat/sessions');
  const sessions = extractList(sessionsApi.data);
  const [creating, setCreating] = useState(false);

  async function handleNew() {
    setCreating(true);
    try {
      const { data } = await api.post('/chat/sessions', { type: 'triage' });
      const sessionId = data.id ?? data._id;
      navigate(`/triage/${sessionId}`);
    } catch {
      setCreating(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <PatientTopbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-[#03045E] tracking-tight">Triagens</h1>
            <p className="text-[#64748B] mt-2 max-w-xl leading-relaxed">
              Converse com nosso assistente para identificar a especialidade adequada às suas necessidades.
            </p>
          </div>
          <Button variant="primary" className="gap-2" disabled={creating} onClick={handleNew}>
            <Plus size={18} /> Nova conversa
          </Button>
        </div>

        {sessionsApi.loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-[#F8FAFC] rounded-2xl animate-pulse" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#CAF0F8] to-[#90E0EF] flex items-center justify-center mx-auto mb-6">
              <Bot size={36} className="text-[#0077B6]" />
            </div>
            <h2 className="text-2xl font-bold text-[#03045E]">Nenhuma triagem ainda</h2>
            <p className="text-[#64748B] mt-2 mb-6">Comece sua primeira conversa com nosso assistente.</p>
            <Button variant="primary" className="gap-2" disabled={creating} onClick={handleNew}>
              <Plus size={18} /> Nova conversa
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <button
                key={s.id ?? s._id}
                onClick={() => navigate(`/triage/${s.id ?? s._id}`)}
                className="w-full flex items-center gap-4 bg-white border border-[#E2E8F0] hover:border-[#48CAE4] rounded-2xl p-5 transition-all hover:shadow-sm group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-[#CAF0F8]/60 text-[#0077B6] flex items-center justify-center shrink-0">
                  <MessageCircle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0F172A]">Conversa de {formatDate(s.createdAt || s.updatedAt || '')}</p>
                  <p className="text-sm text-[#64748B] truncate mt-0.5">
                    {s.lastMessage || s.preview || 'Sem mensagens ainda'}
                  </p>
                </div>
                <ChevronRight size={20} className="text-[#94A3B8] group-hover:text-[#0077B6] transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 flex items-start gap-3 bg-[#CAF0F8]/40 border border-[#90E0EF] rounded-2xl px-5 py-4">
          <Sparkles size={18} className="text-[#0077B6] shrink-0 mt-0.5" />
          <p className="text-sm text-[#03045E]">
            <span className="font-bold">Privacidade:</span> Suas conversas com o assistente ficam disponíveis apenas para você.
          </p>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
