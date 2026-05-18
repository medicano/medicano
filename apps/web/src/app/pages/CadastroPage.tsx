import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Building2,
  Stethoscope,
  Headset,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Hash,
  ShieldCheck,
  Info
} from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MedicanoLogo } from '../components/MedicanoLogo';
import { api } from '../lib/api';
import { useAuth, type UserRole } from '../contexts/AuthContext';

type AccountType = 'PATIENT' | 'CLINIC' | 'PROFESSIONAL' | 'ATTENDANT';

const types: {
  id: AccountType;
  label: string;
  desc: string;
  icon: React.ElementType;
  bg: string;
  accent: string;
}[] = [
  { id: 'PATIENT', label: 'Paciente', desc: 'Agendar consultas', icon: User, bg: 'bg-[#CAF0F8]', accent: 'text-[#00B4D8]' },
  { id: 'CLINIC', label: 'Clínica', desc: 'Gerenciar equipe', icon: Building2, bg: 'bg-[#ADE8F4]', accent: 'text-[#023E8A]' },
  { id: 'PROFESSIONAL', label: 'Profissional', desc: 'Sua agenda individual', icon: Stethoscope, bg: 'bg-[#E0F2FE]', accent: 'text-[#0077B6]' },
  { id: 'ATTENDANT', label: 'Atendente', desc: 'Operar agenda da clínica', icon: Headset, bg: 'bg-[#A7F3D0]', accent: 'text-[#10B981]' }
];

function passwordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pwd.length === 0) return { level: 0, label: '', color: 'bg-[#E2E8F0]' };
  if (pwd.length < 8) return { level: 1, label: 'Fraca', color: 'bg-[#EF4444]' };
  const hasNum = /\d/.test(pwd);
  const hasUp = /[A-Z]/.test(pwd);
  const hasSym = /[^A-Za-z0-9]/.test(pwd);
  const score = [hasNum, hasUp, hasSym].filter(Boolean).length;
  if (score <= 1) return { level: 2, label: 'Média', color: 'bg-[#F59E0B]' };
  return { level: 3, label: 'Forte', color: 'bg-[#10B981]' };
}

export function CadastroPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [account, setAccount] = useState<AccountType | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const strength = passwordStrength(pwd);
  const isAttendant = account === 'ATTENDANT';

  const roleMap: Record<AccountType, UserRole> = {
    PATIENT: 'patient', CLINIC: 'clinic', PROFESSIONAL: 'professional', ATTENDANT: 'attendant',
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwd !== confirm) { setError('As senhas não conferem.'); return; }
    if (!account) return;
    setSubmitting(true);
    try {
      const payload: any = { name, password: pwd, role: roleMap[account] };
      if (isAttendant) {
        payload.clinicId = clinicId;
        payload.username = username;
      } else {
        payload.email = email;
      }
      const { data } = await api.post('/auth/signup', payload);
      const token = data?.token ?? data?.accessToken ?? data?.access_token;
      const user = data?.user ?? data?.profile;
      if (token && user) {
        localStorage.setItem('medicano_token', token);
        localStorage.setItem('medicano_user', JSON.stringify(user));
        window.location.href = user.role === 'patient' ? '/' : '/dashboard';
        return;
      }
      if (!isAttendant) {
        await login(email, pwd);
        navigate(account === 'PATIENT' ? '/' : '/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Não foi possível concluir o cadastro.';
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
          <Link to="/"><MedicanoLogo /></Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0077B6]">
            <ArrowLeft size={16} /> Voltar ao site
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E2E8F0] shadow-xl shadow-[#03045E]/5 p-8 md:p-10 space-y-8">
            <div className="flex items-center gap-2 text-xs font-bold text-[#64748B] uppercase tracking-wider">
              <span className={step === 1 ? 'text-[#0077B6]' : ''}>1. Tipo de conta</span>
              <span>›</span>
              <span className={step === 2 ? 'text-[#0077B6]' : ''}>2. Dados</span>
            </div>

            {step === 1 ? (
              <>
                <div>
                  <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Criar sua conta</h1>
                  <p className="text-[#64748B] mt-2">Escolha o tipo de conta que melhor descreve você.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {types.map((t) => {
                    const Icon = t.icon;
                    const active = account === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setAccount(t.id)}
                        className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                          active
                            ? 'border-[#00B4D8] bg-[#CAF0F8]/30 shadow-sm'
                            : 'border-[#E2E8F0] hover:border-[#48CAE4] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.bg} ${t.accent}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A]">{t.label}</p>
                          <p className="text-sm text-[#64748B] mt-0.5">{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2 text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FCD34D] rounded-xl px-3 py-2.5">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  O tipo de conta não pode ser alterado depois.
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  disabled={!account}
                  onClick={() => setStep(2)}
                  className="w-full gap-2"
                >
                  Continuar <ArrowRight size={18} />
                </Button>

                <p className="text-center text-sm text-[#64748B]">
                  Já tem conta?{' '}
                  <Link to="/login" className="font-semibold text-[#0077B6] hover:text-[#00B4D8]">
                    Entre aqui
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div>
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] hover:text-[#00B4D8] mb-3"
                  >
                    <ArrowLeft size={16} /> Trocar tipo de conta
                  </button>
                  <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">
                    Criar conta de {types.find((t) => t.id === account)?.label.toLowerCase()}
                  </h1>
                </div>

                <form className="space-y-5" onSubmit={handleRegister}>
                  {error && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg text-sm text-[#B91C1C]">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <Field icon={User} label="Nome completo" value={name} onChange={setName} placeholder="Seu nome" required />
                  {isAttendant ? (
                    <>
                      <div className="flex items-start gap-2 text-xs text-[#03045E] bg-[#CAF0F8]/50 border border-[#90E0EF] rounded-xl px-3 py-2.5">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        Solicite o código da clínica ao gestor responsável.
                      </div>
                      <Field icon={Building2} label="Código da clínica" value={clinicId} onChange={setClinicId} placeholder="65a1f2c4d…" required />
                      <Field icon={Hash} label="Nome de usuário" value={username} onChange={setUsername} placeholder="recepcao.ana" required />
                    </>
                  ) : (
                    <Field icon={Mail} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com.br" required />
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-[#0F172A] mb-2">Senha</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#64748B] pointer-events-none">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full h-12 pl-11 pr-12 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#64748B] hover:text-[#0077B6]"
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {pwd.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-3 gap-1.5">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 rounded-full ${i <= strength.level ? strength.color : 'bg-[#E2E8F0]'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-[#64748B]">{strength.label}</span>
                      </div>
                    )}
                  </div>

                  <Field icon={Lock} label="Confirmar senha" type="password" value={confirm} onChange={setConfirm} placeholder="Repita a senha" required />

                  <Button type="submit" variant="primary" size="lg" className="w-full gap-2" disabled={submitting}>
                    {submitting ? 'Criando conta...' : <>Criar conta <ArrowRight size={18} /></>}
                  </Button>
                </form>

                <p className="text-center text-sm text-[#64748B]">
                  Já tem conta?{' '}
                  <Link to="/login" className="font-semibold text-[#0077B6] hover:text-[#00B4D8]">
                    Entre aqui
                  </Link>
                </p>

                <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                  <ShieldCheck size={14} className="text-[#10B981]" />
                  Dados protegidos conforme a LGPD
                </div>
              </>
            )}
          </div>
        </div>
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
