import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Send, Bot, AlertTriangle, ArrowLeft, Stethoscope } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PatientTopbar } from '../components/PatientTopbar';
import { api, streamChatMessage } from '../lib/api';
import { SPECIALTY_LABELS } from '../utils/specialtyLabels';

type Role = 'USER' | 'ASSISTANT';
interface Message {
  id: string;
  role: Role;
  content: string;
  time: string;
}

function parseRecommendation(raw: string): string | null {
  const match = raw.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    const value = parsed.recommendedSpecialty;
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

const MAX = 4096;

function toTime(iso?: string) {
  try {
    return new Date(iso || '').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
}

function cleanContent(raw: string): string {
  return raw.replace(/```json[\s\S]*?```/g, '').trim();
}

type RawMessage = { id?: string; role?: string; content?: string; message?: string; createdAt?: string };

function mapMessages(raw: RawMessage[]): Message[] {
  return raw.map((m) => {
    const isAssistant = m.role === 'ASSISTANT' || m.role === 'assistant';
    const content = m.content || m.message || '';
    return {
      id: m.id || String(Math.random()),
      role: isAssistant ? 'ASSISTANT' : 'USER',
      content: isAssistant ? cleanContent(content) : content,
      time: toTime(m.createdAt),
    };
  });
}

export function TriageChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);

    Promise.all([
      api.get(`/chat/sessions/${sessionId}`),
      api.get(`/chat/sessions/${sessionId}/messages`),
    ])
      .then(([sessionRes, messagesRes]) => {
        if (sessionRes.data?.recommendedSpecialty) {
          setRecommendation(sessionRes.data.recommendedSpecialty);
        }
        const msgs = mapMessages(Array.isArray(messagesRes.data) ? messagesRes.data : (messagesRes.data.messages || []));
        if (msgs.length === 0) {
          msgs.push({
            id: 'welcome',
            role: 'ASSISTANT',
            content: 'Olá! Eu sou o assistente do Medicano. Conte-me o que você está sentindo para eu te ajudar a encontrar a especialidade certa.',
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          });
        }
        setMessages(msgs);
      })
      .catch(() => {
        setMessages([{
          id: 'welcome',
          role: 'ASSISTANT',
          content: 'Olá! Eu sou o assistente do Medicano. Conte-me o que você está sentindo para eu te ajudar a encontrar a especialidade certa.',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }]);
      })
      .finally(() => setLoading(false));

    return () => { cancelRef.current?.(); };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  function send() {
    const t = text.trim();
    if (!t || !sessionId) return;
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: String(Date.now()), role: 'USER', content: t, time: now };
    setMessages((m) => [...m, userMsg]);
    setText('');
    setTyping(true);

    let rawContent = '';
    const assistantId = String(Date.now() + 1);

    const { cancel } = streamChatMessage(
      sessionId,
      t,
      (chunk) => {
        rawContent += chunk;
        const visible = cleanContent(rawContent);
        setTyping(false);
        setMessages((m) => {
          const existing = m.find((x) => x.id === assistantId);
          if (existing) return m.map((x) => x.id === assistantId ? { ...x, content: visible } : x);
          return [...m, { id: assistantId, role: 'ASSISTANT', content: visible, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }];
        });
      },
      () => {
        setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, content: cleanContent(rawContent) } : x));
        setTyping(false);
        const detected = parseRecommendation(rawContent);
        if (detected) setRecommendation(detected);
      },
      () => { setTyping(false); },
    );

    cancelRef.current = cancel;
  }

  return (
    <div className="h-screen flex flex-col font-sans bg-white overflow-hidden">
      <PatientTopbar />

      <div className="bg-[#CAF0F8] border-b border-[#90E0EF] shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-start gap-2.5 text-sm text-[#03045E]">
          <AlertTriangle size={16} className="text-[#0077B6] mt-0.5 shrink-0" />
          <p>
            <span className="font-bold">Atenção:</span> Este chatbot não substitui avaliação médica. Em emergências, ligue 192.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 lg:px-8 overflow-hidden">
        <div className="py-4 flex items-center gap-3 border-b border-[#E2E8F0]">
          <button
            onClick={() => navigate('/triage')}
            className="p-2 rounded-lg hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A]"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-[#0F172A] text-sm">Assistente Medicano</p>
            <p className="text-xs text-[#10B981] font-semibold">Online</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'items-start gap-3'}`}>
                  {i % 2 !== 0 && <div className="w-9 h-9 rounded-full bg-[#E2E8F0] animate-pulse shrink-0" />}
                  <div className={`h-12 rounded-2xl bg-[#E2E8F0] animate-pulse ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
                </div>
              ))}
            </div>
          ) : (
            messages.map((m) =>
              m.role === 'USER' ? (
                <div key={m.id} className="flex flex-col items-end">
                  <div className="max-w-[70%] rounded-2xl rounded-tr-md bg-[#00B4D8] text-white px-4 py-3 text-[15px] leading-relaxed shadow-sm">
                    {m.content}
                  </div>
                  <span className="text-xs text-[#64748B] mt-1.5 mr-1">{m.time}</span>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#0077B6] shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="flex flex-col items-start max-w-[70%]">
                    <div className="rounded-2xl rounded-tl-md bg-[#F8FAFC] text-[#0F172A] px-4 py-3 text-[15px] leading-relaxed border border-[#E2E8F0] prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                    <span className="text-xs text-[#64748B] mt-1.5 ml-1">{m.time}</span>
                  </div>
                </div>
              )
            )
          )}

          {typing && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#0077B6] shrink-0">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 flex gap-1.5">
                <Dot delay={0} />
                <Dot delay={150} />
                <Dot delay={300} />
              </div>
            </div>
          )}
        </div>

        {recommendation ? (
          <div className="py-4 border-t border-[#E2E8F0]">
            <div className="rounded-2xl border border-[#90E0EF] bg-[#CAF0F8] px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#0077B6] flex items-center justify-center shrink-0">
                <Stethoscope size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#03045E]">Triagem concluída</p>
                <p className="text-sm text-[#0077B6]">
                  Especialidade recomendada: <span className="font-semibold">{SPECIALTY_LABELS[recommendation] ?? recommendation}</span>
                </p>
              </div>
              <button
                onClick={() => navigate(`/search?especialidade=${recommendation}`)}
                className="shrink-0 px-4 py-2 rounded-xl bg-[#0077B6] hover:bg-[#03045E] text-white text-sm font-semibold transition-colors"
              >
                Buscar profissionais
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 border-t border-[#E2E8F0]">
            <div className="relative bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] focus-within:border-[#00B4D8] focus-within:ring-4 focus-within:ring-[#CAF0F8] transition-all">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Descreva o que você está sentindo..."
                className="w-full bg-transparent resize-none px-5 py-3.5 pr-16 text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
              />
              <button
                onClick={send}
                disabled={!text.trim() || typing}
                className="absolute right-3 bottom-3 w-11 h-11 rounded-full bg-[#10B981] hover:bg-[#34D399] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                aria-label="Enviar"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="flex items-center justify-end mt-1.5 text-xs text-[#94A3B8]">
              {text.length}/{MAX}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-2 h-2 rounded-full bg-[#94A3B8] animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
