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
  Info,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MedicanoLogo } from '../components/MedicanoLogo';
import { api } from '../lib/api';
import { useAuth, type UserRole } from '../contexts/AuthContext';

type AccountType = 'PATIENT' | 'CLINIC' | 'PROFESSIONAL' | 'ATTENDANT';

const STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
];

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
  { id: 'ATTENDANT', label: 'Atendente', desc: 'Operar agenda da clínica', icon: Headset, bg: 'bg-[#A7F3D0]', accent: 'text-[#10B981]' },
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

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

async function fetchCepAddress(cep: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return { city: data.localidade ?? '', state: data.uf ?? '' };
  } catch {
    return null;
  }
}

export function CadastroPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [account, setAccount] = useState<AccountType | null>(null);

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Patient required fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');

  // Patient optional fields
  const [showOptional, setShowOptional] = useState(false);
  const [gender, setGender] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [cep, setCep] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const strength = passwordStrength(pwd);
  const isAttendant = account === 'ATTENDANT';
  const isPatient = account === 'PATIENT';

  const roleMap: Record<AccountType, UserRole> = {
    PATIENT: 'patient', CLINIC: 'clinic', PROFESSIONAL: 'professional', ATTENDANT: 'attendant',
  };

  async function handleCepBlur() {
    const digits = digitsOnly(cep);
    if (digits.length !== 8) return;
    const address = await fetchCepAddress(digits);
    if (address) {
      setCity(address.city);
      setState(address.state);
    }
  }

  function validatePatientFields(): string | null {
    if (!dateOfBirth) return 'Data de nascimento é obrigatória.';
    const dob = new Date(dateOfBirth);
    if (dob > new Date()) return 'Data de nascimento não pode ser futura.';
    if (dob.getFullYear() < 1900) return 'Data de nascimento inválida.';
    const phoneDigits = digitsOnly(phone);
    if (phoneDigits.length < 10) return 'Telefone deve ter pelo menos 10 dígitos.';
    return null;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pwd !== confirm) { setError('As senhas não conferem.'); return; }
    if (!account) return;

    if (isPatient) {
      const patientError = validatePatientFields();
      if (patientError) { setError(patientError); return; }
    }

    setSubmitting(true);
    try {
      const payload: any = { name, password: pwd, role: roleMap[account] };

      if (isAttendant) {
        payload.clinicId = clinicId;
        payload.username = username;
      } else {
        payload.email = email;
      }

      if (isPatient) {
        payload.dateOfBirth = dateOfBirth;
        payload.phone = '+55' + digitsOnly(phone);
        if (gender) payload.gender = gender;
        if (pronouns) payload.pronouns = pronouns;
        if (cep) payload.cep = digitsOnly(cep);
        if (city) payload.city = city;
        if (state) payload.state = state;
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

                  {isPatient && (
                    <>
                      <Field
                        icon={Calendar}
                        label="Data de nascimento"
                        type="date"
                        value={dateOfBirth}
                        onChange={setDateOfBirth}
                        required
                      />
                      <div>
                        <Field
                          icon={Phone}
                          label="Telefone celular"
                          type="tel"
                          value={phone}
                          onChange={(v) => setPhone(maskPhone(v))}
                          placeholder="(11) 99999-9999"
                          required
                        />
                        <p className="mt-1.5 text-xs text-[#64748B]">
                          Usaremos apenas para confirmações e lembretes de consulta.
                        </p>
                      </div>
                    </>
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

                  {isPatient && (
                    <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowOptional((s) => !s)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                      >
                        <span>Informações adicionais (opcional)</span>
                        {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {showOptional && (
                        <div className="px-4 pb-4 pt-1 space-y-5 border-t border-[#E2E8F0]">
                          <RadioGroup
                            label="Como você se identifica?"
                            value={gender}
                            onChange={setGender}
                            options={[
                              { value: 'FEMALE', label: 'Mulher' },
                              { value: 'MALE', label: 'Homem' },
                              { value: 'NON_BINARY', label: 'Não-binárie' },
                              { value: 'OTHER', label: 'Outro' },
                              { value: 'PREFER_NOT_TO_SAY', label: 'Prefiro não dizer' },
                            ]}
                          />

                          <RadioGroup
                            label="Como você quer ser tratade?"
                            hint="Usado para personalizar a comunicação na plataforma"
                            value={pronouns}
                            onChange={setPronouns}
                            options={[
                              { value: 'SHE', label: 'Ela / Dela' },
                              { value: 'HE', label: 'Ele / Dele' },
                              { value: 'THEY', label: 'Elu / Delu (linguagem neutra)' },
                            ]}
                          />

                          <div className="space-y-3">
                            <div>
                              <Field
                                icon={MapPin}
                                label="CEP"
                                value={cep}
                                onChange={(v) => setCep(digitsOnly(v).slice(0, 8))}
                                placeholder="00000000"
                                onBlur={handleCepBlur}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Field
                                icon={MapPin}
                                label="Cidade"
                                value={city}
                                onChange={setCity}
                                placeholder="São Paulo"
                              />
                              <div>
                                <label className="block text-sm font-semibold text-[#0F172A] mb-2">Estado</label>
                                <select
                                  value={state}
                                  onChange={(e) => setState(e.target.value)}
                                  className="w-full h-12 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8] transition-all"
                                >
                                  <option value="">UF</option>
                                  {STATES.map((uf) => (
                                    <option key={uf} value={uf}>{uf}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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

function Field({
  icon: Icon, label, type = 'text', placeholder, value, onChange, required, onBlur,
}: {
  icon: React.ElementType; label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
  onBlur?: () => void;
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
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8] transition-all"
        />
      </div>
    </div>
  );
}

function RadioGroup({
  label, hint, value, onChange, options,
}: {
  label: string; hint?: string;
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#0F172A] mb-1">{label}</p>
      {hint && <p className="text-xs text-[#64748B] mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? '' : opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
              value === opt.value
                ? 'border-[#00B4D8] bg-[#CAF0F8]/40 text-[#0077B6] font-semibold'
                : 'border-[#E2E8F0] text-[#64748B] hover:border-[#48CAE4]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
