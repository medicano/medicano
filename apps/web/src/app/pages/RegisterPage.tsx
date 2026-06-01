import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft, ArrowRight, User, Building2, Stethoscope, Headset,
  Mail, Lock, Eye, EyeOff, Hash, ShieldCheck, Info, AlertCircle,
  MapPin, FileText, BadgeCheck, Check, Sparkles, Phone
} from 'lucide-react';
import { MedicanoLogo } from '../components/MedicanoLogo';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { SpecialtyCombobox, SPECIALTY_LABEL_TO_ENUM } from '../components/SpecialtyCombobox';

type AccountType = 'PATIENT' | 'CLINIC' | 'PROFESSIONAL' | 'ATTENDANT';
type Step = 1 | 2 | 3;

// ─── account type config ──────────────────────────────────────────────────────

const ACCOUNT_TYPES: { id: AccountType; label: string; desc: string; icon: React.ElementType; bg: string; accent: string }[] = [
  { id: 'PATIENT',      label: 'Paciente',              desc: 'Agendar consultas',           icon: User,         bg: 'bg-[#CAF0F8]',  accent: 'text-[#00B4D8]' },
  { id: 'CLINIC',       label: 'Clínica',               desc: 'Gerenciar equipe',             icon: Building2,    bg: 'bg-[#ADE8F4]',  accent: 'text-[#023E8A]' },
  { id: 'PROFESSIONAL', label: 'Profissional Autônomo',  desc: 'Sua agenda individual',        icon: Stethoscope,  bg: 'bg-[#E0F2FE]',  accent: 'text-[#0077B6]' },
  { id: 'ATTENDANT',    label: 'Atendente',             desc: 'Operar agenda da clínica',    icon: Headset,      bg: 'bg-[#A7F3D0]',  accent: 'text-[#10B981]' },
];

// ─── plan configs ─────────────────────────────────────────────────────────────

const CLINIC_PLANS = [
  {
    id: 'FREE', name: 'Free', price: 'Gratuito', priceNote: '',
    features: ['Até 2 profissionais', 'Agendamento online', 'Notificações básicas'],
    recommended: false,
  },
  {
    id: 'BASIC', name: 'Basic', price: 'R$ 89', priceNote: '/mês',
    features: ['Até 10 profissionais', 'Agendamento online', 'Notificações e lembretes', 'Relatórios básicos'],
    recommended: false,
  },
  {
    id: 'PRO', name: 'Pro', price: 'R$ 179', priceNote: '/mês',
    features: ['Profissionais ilimitados', 'Agendamento online', 'Notificações e lembretes', 'Relatórios avançados', 'Suporte prioritário'],
    recommended: true,
  },
];

const PRO_PLANS = [
  {
    id: 'BASICO', name: 'Básico', price: 'R$ 39', priceNote: '/mês',
    features: ['Agenda online', 'Agendamentos ilimitados', 'Perfil público', 'Notificações por e-mail'],
    recommended: false,
  },
  {
    id: 'AVANCADO', name: 'Avançado', price: 'R$ 69', priceNote: '/mês',
    features: ['Tudo do Básico', 'Triagem com IA', 'Relatórios detalhados', 'Suporte prioritário'],
    recommended: true,
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function passwordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pwd) return { level: 0, label: '', color: 'bg-[#E2E8F0]' };
  if (pwd.length < 8) return { level: 1, label: 'Fraca', color: 'bg-[#EF4444]' };
  const score = [/\d/.test(pwd), /[A-Z]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)].filter(Boolean).length;
  if (score <= 1) return { level: 2, label: 'Média', color: 'bg-[#F59E0B]' };
  return { level: 3, label: 'Forte', color: 'bg-[#10B981]' };
}

function applyMask(value: string, mask: string): string {
  const digits = value.replace(/\D/g, '');
  let result = '';
  let di = 0;
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    if (mask[i] === '0') { result += digits[di++]; }
    else { result += mask[i]; }
  }
  return result;
}

function cnpjMask(v: string) { return applyMask(v, '00.000.000/0000-00'); }
function cpfMask(v: string) { return applyMask(v, '000.000.000-00'); }
function phoneMask(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  // 10 dígitos (fixo) usa máscara mais curta que 11 (celular)
  return applyMask(digits, digits.length <= 10 ? '(00) 0000-0000' : '(00) 00000-0000');
}

// ─── step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: Step; total: number }) {
  const labels = ['Tipo de conta', 'Seus dados', 'Plano'];
  const steps = total === 2 ? [1, 2] : [1, 2, 3];

  return (
    <div className="flex items-center gap-0 mb-2">
      {steps.map((s, idx) => {
        const done = s < current;
        const active = s === current;
        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                done   ? 'bg-[#10B981] text-white' :
                active ? 'bg-[#0077B6] text-white ring-4 ring-[#0077B6]/20' :
                         'bg-[#E2E8F0] text-[#94A3B8]'
              }`}>
                {done ? <Check size={14} /> : <span className="text-xs font-bold">{s}</span>}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${
                active ? 'text-[#0077B6]' : done ? 'text-[#10B981]' : 'text-[#94A3B8]'
              }`}>{labels[s - 1]}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 rounded ${done ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── field components ─────────────────────────────────────────────────────────

function Field({
  icon: Icon, label, type = 'text', placeholder, value, onChange, error, required, hint,
}: {
  icon: React.ElementType; label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; error?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">{label}</label>
      {hint && <p className="text-xs text-[#64748B] mb-1.5">{hint}</p>}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748B] pointer-events-none">
          <Icon size={17} />
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full h-12 pl-10 pr-4 rounded-xl bg-white border text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-4 transition-all ${
            error
              ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FEE2E2]'
              : 'border-[#E2E8F0] focus:border-[#00B4D8] focus:ring-[#CAF0F8]'
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-[#EF4444] flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}


function PasswordField({
  label, value, onChange, error, showStrength,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string; showStrength?: boolean;
}) {
  const [show, setShow] = useState(false);
  const strength = passwordStrength(value);
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748B] pointer-events-none">
          <Lock size={17} />
        </div>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className={`w-full h-12 pl-10 pr-11 rounded-xl bg-white border text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-4 transition-all ${
            error
              ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FEE2E2]'
              : 'border-[#E2E8F0] focus:border-[#00B4D8] focus:ring-[#CAF0F8]'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#0077B6]"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 grid grid-cols-3 gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i <= strength.level ? strength.color : 'bg-[#E2E8F0]'}`} />
            ))}
          </div>
          <span className={`text-xs font-semibold ${
            strength.level === 1 ? 'text-[#EF4444]' : strength.level === 2 ? 'text-[#F59E0B]' : 'text-[#10B981]'
          }`}>{strength.label}</span>
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-[#EF4444] flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan, selected, onSelect,
}: {
  plan: typeof CLINIC_PLANS[number]; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all w-full ${
        selected
          ? 'border-[#0077B6] bg-[#F0FBFF] shadow-md shadow-[#0077B6]/10'
          : 'border-[#E2E8F0] bg-white hover:border-[#0077B6]/40 hover:bg-[#F8FAFC]'
      }`}
    >
      {plan.recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-[#10B981] text-white text-[11px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
          <Sparkles size={11} /> Recomendado
        </span>
      )}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-extrabold text-[#03045E]">{plan.name}</p>
          <p className="text-[#64748B] text-xs mt-0.5">{(plan as { subtitle?: string }).subtitle ?? ''}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
          selected ? 'border-[#0077B6] bg-[#0077B6]' : 'border-[#CBD5E1]'
        }`}>
          {selected && <Check size={11} className="text-white" />}
        </div>
      </div>
      <div className="mb-4">
        <span className="text-2xl font-extrabold text-[#03045E]">{plan.price}</span>
        <span className="text-sm text-[#64748B]">{plan.priceNote}</span>
      </div>
      <ul className="space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[#0F172A]">
            <Check size={14} className="text-[#10B981] shrink-0 mt-0.5" /> {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [account, setAccount] = useState<AccountType | null>(null);

  // Patient fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');

  // Clinic fields
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');

  // Professional fields
  const [cpf, setCpf] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [regNum, setRegNum] = useState('');
  const [city, setCity] = useState('');

  // Attendant fields
  const [clinicCode, setClinicCode] = useState('');
  const [username, setUsername] = useState('');

  // Plan
  const [plan, setPlan] = useState<string>('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const hasStep3 = account === 'CLINIC' || account === 'PROFESSIONAL';
  const totalSteps = hasStep3 ? 3 : 2;
  const plans = account === 'CLINIC' ? CLINIC_PLANS : PRO_PLANS;

  // ── validation ──────────────────────────────────────────────────────────────

  function validateStep2(): boolean {
    const e: Record<string, string> = {};

    if (account === 'PATIENT') {
      if (!name.trim()) e.name = 'Nome é obrigatório';
      if (!email.trim()) e.email = 'E-mail é obrigatório';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido';
      if (!phone.trim()) e.phone = 'Telefone é obrigatório';
      else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone deve ter pelo menos 10 dígitos (com DDD)';
      if (!pwd) e.pwd = 'Senha é obrigatória';
      else if (pwd.length < 8) e.pwd = 'Senha deve ter pelo menos 8 caracteres';
      if (!confirm) e.confirm = 'Confirme a senha';
      else if (pwd !== confirm) e.confirm = 'As senhas não conferem';
    }

    if (account === 'CLINIC') {
      if (!razaoSocial.trim()) e.razaoSocial = 'Razão social é obrigatória';
      if (!cnpj.trim()) e.cnpj = 'CNPJ é obrigatório';
      else if (cnpj.replace(/\D/g, '').length < 14) e.cnpj = 'CNPJ inválido';
      if (!email.trim()) e.email = 'E-mail é obrigatório';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido';
      if (!pwd) e.pwd = 'Senha é obrigatória';
      else if (pwd.length < 8) e.pwd = 'Senha deve ter pelo menos 8 caracteres';
      if (!confirm) e.confirm = 'Confirme a senha';
      else if (pwd !== confirm) e.confirm = 'As senhas não conferem';
    }

    if (account === 'PROFESSIONAL') {
      if (!name.trim()) e.name = 'Nome é obrigatório';
      if (!cpf.trim()) e.cpf = 'CPF é obrigatório';
      else if (cpf.replace(/\D/g, '').length < 11) e.cpf = 'CPF inválido';
      if (!specialty) e.specialty = 'Selecione uma especialidade';
      if (!regNum.trim()) e.regNum = 'Registro profissional é obrigatório';
      if (!city.trim()) e.city = 'Cidade é obrigatória';
      if (!email.trim()) e.email = 'E-mail é obrigatório';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido';
      if (!pwd) e.pwd = 'Senha é obrigatória';
      else if (pwd.length < 8) e.pwd = 'Senha deve ter pelo menos 8 caracteres';
      if (!confirm) e.confirm = 'Confirme a senha';
      else if (pwd !== confirm) e.confirm = 'As senhas não conferem';
    }

    if (account === 'ATTENDANT') {
      if (!clinicCode.trim()) e.clinicCode = 'Código da clínica é obrigatório';
      if (!username.trim()) e.username = 'Nome de usuário é obrigatório';
      if (!pwd) e.pwd = 'Senha é obrigatória';
      else if (pwd.length < 8) e.pwd = 'Senha deve ter pelo menos 8 caracteres';
      if (!confirm) e.confirm = 'Confirme a senha';
      else if (pwd !== confirm) e.confirm = 'As senhas não conferem';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNextFromStep2() {
    if (!validateStep2()) return;
    if (hasStep3) {
      if (!plan && plans[1]) setPlan(plans[1].id); // default to recommended
      setStep(3);
    } else {
      handleSubmit();
    }
  }

  // ── submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!account) return;
    setGlobalError(null);
    setSubmitting(true);
    try {
      const roleMap: Record<AccountType, UserRole> = {
        PATIENT: 'patient', CLINIC: 'clinic', PROFESSIONAL: 'professional', ATTENDANT: 'attendant',
      };
      const payload: Record<string, unknown> = { role: roleMap[account] };

      if (account === 'PATIENT') {
        Object.assign(payload, { name, email, password: pwd, phone: phone.replace(/\D/g, '') });
      } else if (account === 'CLINIC') {
        Object.assign(payload, { name: razaoSocial, email, password: pwd, cnpj: cnpj.replace(/\D/g, '') });
      } else if (account === 'PROFESSIONAL') {
        Object.assign(payload, { name, email, password: pwd, cpf, specialty: SPECIALTY_LABEL_TO_ENUM[specialty] || specialty, regNum, city });
      } else if (account === 'ATTENDANT') {
        Object.assign(payload, { clinicId: clinicCode, username, password: pwd });
      }

      const { data } = await api.post('/auth/signup', payload);
      const token = data?.token ?? data?.accessToken;
      const user = data?.user ?? data?.profile;

      if (token && user) {
        localStorage.setItem('medicano_token', token);
        localStorage.setItem('medicano_user', JSON.stringify(user));
        window.location.href = ['patient'].includes(user.role) ? '/home' : '/dashboard';
        return;
      }

      if (account !== 'ATTENDANT') {
        await login(email, pwd);
        navigate(account === 'PATIENT' ? '/home' : '/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Não foi possível concluir o cadastro.');

      if (message.toLowerCase().includes('cpf')) {
        setErrors((prev) => ({ ...prev, cpf: message }));
        setStep(2);
      } else if (message.toLowerCase().includes('cnpj')) {
        setErrors((prev) => ({ ...prev, cnpj: message }));
        setStep(2);
      } else if (message.toLowerCase().includes('email') || message.toLowerCase().includes('usuário já cadastrado')) {
        setErrors((prev) => ({ ...prev, email: message }));
        setStep(2);
      } else {
        setGlobalError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ─── render ────────────────────────────────────────────────────────────────

  const selectedType = ACCOUNT_TYPES.find((t) => t.id === account);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#CAF0F8]/40 relative overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#CAF0F8]/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#A7F3D0]/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col px-6 py-8">
        {/* Header */}
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <Link to="/"><MedicanoLogo /></Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#0077B6] transition-colors">
            <ArrowLeft size={15} /> Voltar ao site
          </Link>
        </div>

        {/* Card */}
        <div className="flex-1 flex items-center justify-center py-10">
          <div className={`w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-xl shadow-[#03045E]/5 p-8 md:p-10 space-y-7 ${
            step === 3 ? 'max-w-3xl' : 'max-w-2xl'
          }`}>

            {/* Step indicator */}
            <StepIndicator current={step} total={totalSteps} />

            {/* ── STEP 1: account type ── */}
            {step === 1 && (
              <>
                <div>
                  <h1 className="text-[28px] font-extrabold text-[#03045E] tracking-tight leading-tight">Criar sua conta</h1>
                  <p className="text-[#64748B] mt-1.5 text-sm">Escolha o tipo de conta que melhor descreve você.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {ACCOUNT_TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = account === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setAccount(t.id)}
                        className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          active
                            ? 'border-[#0077B6] bg-[#F0FBFF] shadow-sm'
                            : 'border-[#E2E8F0] hover:border-[#0077B6]/40 hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.bg} ${t.accent}`}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#0F172A]">{t.label}</p>
                          <p className="text-sm text-[#64748B] mt-0.5">{t.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                          active ? 'border-[#0077B6] bg-[#0077B6]' : 'border-[#CBD5E1]'
                        }`}>
                          {active && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2 text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FCD34D] rounded-xl px-3 py-2.5">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  O tipo de conta não pode ser alterado depois do cadastro.
                </div>

                <button
                  disabled={!account}
                  onClick={() => setStep(2)}
                  className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    account
                      ? 'bg-[#10B981] hover:bg-[#059669] text-white shadow-md shadow-[#10B981]/30'
                      : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                  }`}
                >
                  Continuar <ArrowRight size={17} />
                </button>

                <p className="text-center text-sm text-[#64748B]">
                  Já tem conta?{' '}
                  <Link to="/login" className="font-semibold text-[#0077B6] hover:text-[#00B4D8]">
                    Entre aqui
                  </Link>
                </p>
              </>
            )}

            {/* ── STEP 2: fields ── */}
            {step === 2 && (
              <>
                <div>
                  <button
                    onClick={() => { setStep(1); setErrors({}); }}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] hover:text-[#023E8A] mb-2 transition-colors"
                  >
                    <ArrowLeft size={15} /> Trocar tipo de conta
                  </button>
                  <div className="flex items-center gap-3">
                    {selectedType && (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedType.bg} ${selectedType.accent}`}>
                        <selectedType.icon size={18} />
                      </div>
                    )}
                    <div>
                      <h1 className="text-[26px] font-extrabold text-[#03045E] tracking-tight leading-tight">
                        Conta de {selectedType?.label.toLowerCase()}
                      </h1>
                      <p className="text-xs text-[#64748B] mt-0.5">Preencha seus dados para continuar</p>
                    </div>
                  </div>
                </div>

                {globalError && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-sm text-[#B91C1C]">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" /> {globalError}
                  </div>
                )}

                <div className="space-y-4">
                  {/* PATIENT */}
                  {account === 'PATIENT' && (
                    <>
                      <Field icon={User} label="Nome completo" value={name} onChange={setName} placeholder="Seu nome completo" error={errors.name} />
                      <Field icon={Mail} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com.br" error={errors.email} />
                      <Field
                        icon={Phone} label="Telefone" type="tel" value={phone}
                        onChange={(v) => setPhone(phoneMask(v))}
                        placeholder="(11) 91234-5678" error={errors.phone}
                      />
                      <PasswordField label="Senha" value={pwd} onChange={setPwd} error={errors.pwd} showStrength />
                      <PasswordField label="Confirmar senha" value={confirm} onChange={setConfirm} error={errors.confirm} />
                    </>
                  )}

                  {/* CLINIC */}
                  {account === 'CLINIC' && (
                    <>
                      <Field icon={Building2} label="Razão social" value={razaoSocial} onChange={setRazaoSocial} placeholder="Nome da clínica LTDA" error={errors.razaoSocial} />
                      <Field
                        icon={FileText} label="CNPJ" value={cnpj}
                        onChange={(v) => setCnpj(cnpjMask(v))}
                        placeholder="00.000.000/0000-00" error={errors.cnpj}
                      />
                      <Field icon={Mail} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="contato@clinica.com.br" error={errors.email} />
                      <PasswordField label="Senha" value={pwd} onChange={setPwd} error={errors.pwd} showStrength />
                      <PasswordField label="Confirmar senha" value={confirm} onChange={setConfirm} error={errors.confirm} />
                    </>
                  )}

                  {/* PROFESSIONAL */}
                  {account === 'PROFESSIONAL' && (
                    <>
                      <Field icon={User} label="Nome completo" value={name} onChange={setName} placeholder="Dr(a). Seu Nome" error={errors.name} />
                      <Field
                        icon={FileText} label="CPF" value={cpf}
                        onChange={(v) => setCpf(cpfMask(v))}
                        placeholder="000.000.000-00" error={errors.cpf}
                      />
                      <div className="grid sm:grid-cols-2 gap-4">
                        <SpecialtyCombobox
                          label="Especialidade"
                          value={specialty}
                          onChange={setSpecialty}
                          placeholder="Selecione…"
                          error={errors.specialty}
                        />
                        <Field icon={BadgeCheck} label="Registro profissional" value={regNum} onChange={setRegNum} placeholder="Ex.: CRM, CRN, CRP, COREN, CRO…" error={errors.regNum} />
                      </div>
                      <Field icon={MapPin} label="Cidade de atendimento" value={city} onChange={setCity} placeholder="São Paulo, SP" error={errors.city} />
                      <Field icon={Mail} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com.br" error={errors.email} />
                      <PasswordField label="Senha" value={pwd} onChange={setPwd} error={errors.pwd} showStrength />
                      <PasswordField label="Confirmar senha" value={confirm} onChange={setConfirm} error={errors.confirm} />
                    </>
                  )}

                  {/* ATTENDANT */}
                  {account === 'ATTENDANT' && (
                    <>
                      <div className="flex items-start gap-2 text-xs text-[#03045E] bg-[#CAF0F8]/50 border border-[#90E0EF] rounded-xl px-3 py-2.5">
                        <Info size={14} className="mt-0.5 shrink-0 text-[#0077B6]" />
                        Solicite o código da clínica ao gestor responsável.
                      </div>
                      <Field icon={Building2} label="Código da clínica" value={clinicCode} onChange={setClinicCode} placeholder="ID da clínica (ex: clinic-001)" error={errors.clinicCode} />
                      <Field icon={Hash} label="Nome de usuário" value={username} onChange={setUsername} placeholder="recepcao.maria" error={errors.username} />
                      <PasswordField label="Senha" value={pwd} onChange={setPwd} error={errors.pwd} showStrength />
                      <PasswordField label="Confirmar senha" value={confirm} onChange={setConfirm} error={errors.confirm} />
                    </>
                  )}
                </div>

                <button
                  onClick={handleNextFromStep2}
                  disabled={submitting}
                  className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white shadow-md shadow-[#10B981]/30 transition-all disabled:opacity-60"
                >
                  {submitting ? 'Criando conta...' : hasStep3 ? <>Continuar <ArrowRight size={17} /></> : <>Criar conta <ArrowRight size={17} /></>}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                  <ShieldCheck size={13} className="text-[#10B981]" />
                  Dados protegidos conforme a LGPD
                </div>
              </>
            )}

            {/* ── STEP 3: plan selection ── */}
            {step === 3 && (
              <>
                <div>
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] hover:text-[#023E8A] mb-2 transition-colors"
                  >
                    <ArrowLeft size={15} /> Voltar aos dados
                  </button>
                  <h1 className="text-[26px] font-extrabold text-[#03045E] tracking-tight leading-tight">
                    Escolha seu plano
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    {account === 'CLINIC'
                      ? 'Planos para grupos de saúde e clínicas.'
                      : 'Planos para profissionais autônomos.'}
                  </p>
                </div>

                {globalError && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-sm text-[#B91C1C]">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" /> {globalError}
                  </div>
                )}

                <div className={`grid gap-4 ${account === 'CLINIC' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {plans.map((p) => (
                    <div key={p.id} className="pt-3">
                      <PlanCard
                        plan={p}
                        selected={plan === p.id}
                        onSelect={() => setPlan(p.id)}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !plan}
                  className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white shadow-md shadow-[#10B981]/30 transition-all disabled:opacity-60"
                >
                  {submitting ? 'Criando conta...' : <>Começar com este plano <ArrowRight size={17} /></>}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                  <ShieldCheck size={13} className="text-[#10B981]" />
                  Dados protegidos conforme a LGPD · Cancele quando quiser
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
