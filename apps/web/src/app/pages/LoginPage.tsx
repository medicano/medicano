import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Building2, ShieldCheck, Hash, AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MedicanoLogo } from '../components/MedicanoLogo';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'padrao' | 'atendente';

export function LoginPage() {
  const [tab, setTab] = useState<Tab>('padrao');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login, loginAttendant } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = tab === 'atendente'
        ? await loginAttendant(clinicId, username, password)
        : await login(email, password);
      const destination = user.role === 'patient' ? '/home' : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao entrar. Verifique suas credenciais.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-[#F8FAFC] via-white to-[#CAF0F8]/40 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#CAF0F8]/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#A7F3D0]/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col px-6 py-8">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex"><MedicanoLogo /></Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0077B6] transition-colors">
            <ArrowLeft size={16} /> Voltar ao site
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] shadow-xl shadow-[#03045E]/5 p-8 md:p-10 space-y-8">
            <div>
              <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight leading-tight">Bem-vindo de volta.</h1>
              <p className="text-[#64748B] mt-2 leading-relaxed">Entre na sua conta para continuar.</p>
            </div>

            <div className="grid grid-cols-2 p-1 bg-[#F1F5F9] rounded-xl">
              <button
                onClick={() => { setTab('padrao'); setError(null); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === 'padrao' ? 'bg-white text-[#03045E] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
              >Login padrão</button>
              <button
                onClick={() => { setTab('atendente'); setError(null); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === 'atendente' ? 'bg-white text-[#03045E] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
              >Sou atendente</button>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg text-sm text-[#B91C1C]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {tab === 'padrao' ? (
                <Field icon={Mail} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com.br" required />
              ) : (
                <>
                  <p className="text-xs text-[#64748B] bg-[#CAF0F8]/40 border border-[#90E0EF] rounded-lg px-3 py-2.5 leading-relaxed">
                    Use as credenciais fornecidas pela sua clínica.
                  </p>
                  <Field icon={Building2} label="Código da clínica" value={clinicId} onChange={setClinicId} placeholder="Ex: saude-total" required />
                  <Field icon={Hash} label="Nome de usuário" value={username} onChange={setUsername} placeholder="recepcao.ana" required />
                </>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-[#0F172A]">Senha</label>
                  {tab === 'padrao' && (
                    <a href="#" className="text-sm font-semibold text-[#0077B6] hover:text-[#00B4D8]">Esqueci minha senha</a>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#64748B] pointer-events-none">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-12 pl-11 pr-12 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#64748B] hover:text-[#0077B6]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full gap-2" disabled={submitting}>
                {submitting ? 'Entrando...' : <>Entrar <ArrowRight size={18} /></>}
              </Button>
            </form>

            <p className="text-center text-sm text-[#64748B]">
              {tab === 'padrao' ? (
                <>
                  Ainda não tem conta?{' '}
                  <Link to="/register" className="font-semibold text-[#0077B6] hover:text-[#00B4D8]">Criar uma conta</Link>
                </>
              ) : (
                <>Não tem acesso? <span className="font-semibold text-[#0077B6]">Peça para a sua clínica</span></>
              )}
            </p>

            <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
              <ShieldCheck size={14} className="text-[#10B981]" />
              Dados protegidos conforme a LGPD
            </div>
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] text-center">© {new Date().getFullYear()} Medicano Saúde Inteligente LTDA</p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, type = 'text', placeholder, value, onChange, required }: {
  icon: React.ElementType; label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0F172A] mb-2">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#64748B] pointer-events-none">
          <Icon size={18} />
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8] transition-all"
        />
      </div>
    </div>
  );
}
