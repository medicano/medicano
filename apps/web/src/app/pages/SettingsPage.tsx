import React, { useState, useEffect } from 'react';
import {
  Save, Building2, MapPin, Phone, Mail, Globe, Clock, Bell,
  User, Stethoscope, Users, AlertCircle, Check, ChevronDown,
  Calendar, FileText, Hash,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { SpecialtyCombobox } from '../components/SpecialtyCombobox';

// ─── constants ────────────────────────────────────────────────────────────────

const SPECIALTIES = ['Medicina', 'Psicologia', 'Odontologia', 'Nutrição', 'Fisioterapia', 'Fonoaudiologia', 'Psiquiatria', 'Outro'];
const GENDERS = ['Masculino', 'Feminino', 'Não-binário', 'Prefiro não informar'];

// ─── shared primitive components ─────────────────────────────────────────────

const font: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

function ic(error?: string) {
  return `w-full h-11 pl-10 pr-4 rounded-xl border text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] bg-white focus:outline-none focus:ring-2 transition-all ${
    error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-[#E2E8F0] focus:border-[#0077B6] focus:ring-[#0077B6]/10'
  }`;
}

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-[#EF4444]">
      <AlertCircle size={12} /> {msg}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">{children}</span>;
}

function IconWrap({ icon: Icon, error }: { icon: React.ElementType; error?: string }) {
  return (
    <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${error ? 'text-[#EF4444]' : 'text-[#64748B]'}`}>
      <Icon size={16} />
    </span>
  );
}

interface TextFieldProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  badge?: string;
}

function TextField({ label, icon, value, onChange, error, type = 'text', placeholder, readOnly, badge }: TextFieldProps) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <IconWrap icon={icon} error={error} />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`${ic(error)} ${readOnly ? 'bg-[#F8FAFC] cursor-not-allowed text-[#94A3B8]' : ''}`}
        />
        {badge && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E2E8F0] text-[#64748B] whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>
      <FieldErr msg={error} />
    </label>
  );
}

function SelectField({ label, icon, value, onChange, options, error }: {
  label: string; icon: React.ElementType; value: string; onChange: (v: string) => void;
  options: string[]; error?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <IconWrap icon={icon} error={error} />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${ic(error)} appearance-none pr-8`}
        >
          <option value="">Selecione…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
      </div>
      <FieldErr msg={error} />
    </label>
  );
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }: {
  icon: React.ElementType; title: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/60">
      <div className="w-10 h-10 rounded-xl bg-[#CAF0F8] flex items-center justify-center shrink-0">
        <Icon size={18} className="text-[#0077B6]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#03045E]">{title}</p>
        <p className="text-sm text-[#64748B]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#0077B6]' : 'bg-[#CBD5E1]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

// ─── section card + save row ──────────────────────────────────────────────────

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-sm" style={font}>
      <div className="px-6 py-5 border-b border-[#E2E8F0]">
        <h2 className="font-bold text-[#03045E]">{title}</h2>
        <p className="text-sm text-[#64748B] mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function SaveRow({ saving, saved, error, onSave }: {
  saving: boolean; saved: boolean; error: string | null; onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-4 mt-2 border-t border-[#E2E8F0]">
      <p className="text-sm text-[#64748B]">
        {error
          ? <span className="text-[#B91C1C] font-semibold">{error}</span>
          : saved
          ? <span className="text-[#10B981] font-semibold flex items-center gap-1.5"><Check size={13} /> Alterações salvas.</span>
          : 'As alterações entram em vigor imediatamente.'}
      </p>
      <button
        onClick={onSave}
        disabled={saving}
        className={`inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold transition-colors shrink-0 ${
          saved
            ? 'bg-[#10B981] text-white'
            : 'bg-[#10B981] hover:bg-[#059669] text-white shadow-sm shadow-[#10B981]/30'
        } disabled:opacity-60`}
      >
        {saved ? <><Check size={14} /> Salvo</> : saving ? 'Salvando…' : <><Save size={14} /> Salvar alterações</>}
      </button>
    </div>
  );
}

// ─── useSave ──────────────────────────────────────────────────────────────────

function useSave() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function trigger(fn: () => Promise<void>) {
    setSaving(true);
    setSaveError(null);
    try {
      await fn();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return { saving, saved, saveError, trigger };
}

// ─── sections ─────────────────────────────────────────────────────────────────

function ClinicDataSection({ data }: { data: any }) {
  const [name, setName] = useState(data.name ?? '');
  const [email, setEmail] = useState(data.email ?? '');
  const [phone, setPhone] = useState(data.phone ?? '');
  const [website, setWebsite] = useState(data.website ?? '');
  const [address, setAddress] = useState(data.address ?? '');
  const [hours, setHours] = useState(data.hours ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { saving, saved, saveError, trigger } = useSave();

  function clr(k: string) { setErrors((prev) => { const { [k]: _, ...rest } = prev; return rest; }); }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!email.trim()) e.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSave() {
    if (!validate()) return;
    trigger(() => api.put('/profile/me/clinic', { name, email, phone }).then(() => {}));
  }

  return (
    <SectionCard title="Dados da clínica" description="Informações exibidas no perfil público.">
      <TextField label="Nome da clínica" icon={Building2} value={name} onChange={(v) => { setName(v); clr('name'); }} error={errors.name} placeholder="Razão social ou nome fantasia" />
      <div className="grid md:grid-cols-2 gap-4">
        <TextField label="E-mail" icon={Mail} type="email" value={email} onChange={(v) => { setEmail(v); clr('email'); }} error={errors.email} placeholder="contato@clinica.com.br" />
        <TextField label="Telefone" icon={Phone} value={phone} onChange={setPhone} placeholder="(11) 3456-7890" />
      </div>
      <TextField label="Site" icon={Globe} value={website} onChange={setWebsite} placeholder="clinica.com.br" />
      <TextField label="Endereço" icon={MapPin} value={address} onChange={setAddress} placeholder="Av. Exemplo, 123 – Cidade, UF" />
      <TextField label="Horário de funcionamento" icon={Clock} value={hours} onChange={setHours} placeholder="Seg–Sex: 08h–18h | Sáb: 08h–13h" />
      <SaveRow saving={saving} saved={saved} error={saveError} onSave={handleSave} />
    </SectionCard>
  );
}

function ClinicCodeSection({ data }: { data: any }) {
  const [customCode, setCustomCode] = useState(data.customCode ?? '');
  const [error, setError] = useState('');
  const { saving, saved, saveError, trigger } = useSave();

  function handleSave() {
    if (!customCode.trim()) { setError('Informe o código da clínica'); return; }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(customCode.trim())) {
      setError('Use apenas letras, números, hífen ou underscore (3–30 caracteres)');
      return;
    }
    setError('');
    trigger(() => api.put('/settings', { customCode: customCode.trim() }).then(() => {}));
  }

  return (
    <SectionCard title="Código da clínica" description="Defina um código único que profissionais e atendentes usam para se vincular à sua clínica.">
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-[#CAF0F8]/40 border border-[#90E0EF]/60">
        <Hash size={16} className="text-[#0077B6] mt-0.5 shrink-0" />
        <p className="text-sm text-[#03045E]">
          Compartilhe este código com os profissionais e atendentes que deseja vincular à clínica. Eles informarão este código ao criar ou acessar a conta.
        </p>
      </div>
      <label className="block">
        <FieldLabel>Código personalizado</FieldLabel>
        <div className="relative">
          <IconWrap icon={Hash} error={error} />
          <input
            type="text"
            value={customCode}
            onChange={(e) => { setCustomCode(e.target.value); setError(''); }}
            placeholder="Ex.: saude-total, clinica123"
            className={`${ic(error)} font-mono`}
          />
        </div>
        <FieldErr msg={error} />
        <p className="mt-1.5 text-xs text-[#94A3B8]">Somente letras, números, hífen e underscore. Entre 3 e 30 caracteres.</p>
      </label>
      {data.customCode && (
        <p className="text-xs text-[#10B981] font-semibold flex items-center gap-1.5">
          <Check size={13} /> Código atual: <span className="font-mono">{data.customCode}</span>
        </p>
      )}
      <SaveRow saving={saving} saved={saved} error={saveError} onSave={handleSave} />
    </SectionCard>
  );
}

function AttendantConfigSection({ data }: { data: any }) {
  const [allowConsec, setAllowConsec] = useState(data.allowConsecutiveAttendants === true);
  const { saving, saved, saveError, trigger } = useSave();

  function handleSave() {
    trigger(() => api.put('/settings', { allowConsecutiveAttendants: allowConsec }).then(() => {}));
  }

  return (
    <SectionCard title="Configuração de atendentes" description="Defina como os atendentes operam a agenda.">
      <ToggleRow
        icon={Users}
        title="Permitir agendamentos consecutivos sem intervalo entre atendentes"
        description="Quando ativo, consultas seguidas não geram bloqueio de intervalo no sistema."
        checked={allowConsec}
        onChange={setAllowConsec}
      />
      <SaveRow saving={saving} saved={saved} error={saveError} onSave={handleSave} />
    </SectionCard>
  );
}

function NotificationsSection({ data }: { data: any }) {
  const [notifyEmail, setNotifyEmail] = useState(data.notifyEmail !== false);
  const [notifySms, setNotifySms] = useState(data.notifySms === true);
  const { saving, saved, saveError, trigger } = useSave();

  function handleSave() {
    trigger(() => api.put('/settings', { notifyEmail, notifySms }).then(() => {}));
  }

  return (
    <SectionCard title="Notificações" description="Escolha como deseja receber avisos sobre agendamentos.">
      <ToggleRow icon={Mail} title="Notificações por e-mail" description="Receber confirmações e lembretes por e-mail." checked={notifyEmail} onChange={setNotifyEmail} />
      <ToggleRow icon={Bell} title="Notificações por SMS" description="Receber lembretes via mensagem de texto." checked={notifySms} onChange={setNotifySms} />
      <SaveRow saving={saving} saved={saved} error={saveError} onSave={handleSave} />
    </SectionCard>
  );
}

function AppointmentPrefsSection({ data }: { data: any }) {
  const [autoConfirm, setAutoConfirm] = useState(data.autoConfirm !== false);
  const { saving, saved, saveError, trigger } = useSave();

  function handleSave() {
    trigger(() => api.put('/settings', { autoConfirm }).then(() => {}));
  }

  return (
    <SectionCard title="Preferências de agendamento" description="Defina o comportamento padrão da agenda.">
      <ToggleRow
        icon={Clock}
        title="Confirmar agendamentos automaticamente"
        description="Novos agendamentos serão marcados como confirmados sem revisão manual."
        checked={autoConfirm}
        onChange={setAutoConfirm}
      />
      <SaveRow saving={saving} saved={saved} error={saveError} onSave={handleSave} />
    </SectionCard>
  );
}

function ProfessionalDataSection({ data }: { data: any }) {
  const [name, setName] = useState(data.name ?? '');
  const [email, setEmail] = useState(data.email ?? '');
  const [specialty, setSpecialty] = useState(data.specialty ?? '');
  const [city, setCity] = useState(data.city ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { saving, saved, saveError, trigger } = useSave();

  function clr(k: string) { setErrors((prev) => { const { [k]: _, ...rest } = prev; return rest; }); }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!email.trim()) e.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido';
    if (!specialty) e.specialty = 'Selecione uma especialidade';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSave() {
    if (!validate()) return;
    trigger(() => api.put('/profile/me/professional', { name, email, specialty, address: city ? { city } : undefined }).then(() => {}));
  }

  return (
    <SectionCard title="Dados do profissional" description="Informações exibidas no seu perfil público.">
      <TextField label="Nome completo" icon={User} value={name} onChange={(v) => { setName(v); clr('name'); }} error={errors.name} placeholder="Dr(a). Seu Nome" />
      <TextField label="E-mail" icon={Mail} type="email" value={email} onChange={(v) => { setEmail(v); clr('email'); }} error={errors.email} placeholder="seu@email.com.br" />
      <div className="grid md:grid-cols-2 gap-4">
        <SpecialtyCombobox label="Especialidade" value={specialty} onChange={(v) => { setSpecialty(v); clr('specialty'); }} error={errors.specialty} />
        <TextField label="Cidade de atendimento" icon={MapPin} value={city} onChange={setCity} placeholder="São Paulo, SP" />
      </div>
      <SaveRow saving={saving} saved={saved} error={saveError} onSave={handleSave} />
    </SectionCard>
  );
}

function PatientProfileSection({ data }: { data: any }) {
  const [name, setName] = useState(data.name ?? '');
  const [phone, setPhone] = useState(data.phone ?? '');
  const [birthDate, setBirthDate] = useState(data.birthDate ?? '');
  const [gender, setGender] = useState(data.gender ?? '');
  const [pronouns, setPronouns] = useState(data.pronouns ?? '');
  const [cep, setCep] = useState(data.cep ?? '');
  const [city, setCity] = useState(data.city ?? '');
  const [state, setState] = useState(data.state ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { saving, saved, saveError, trigger } = useSave();

  function clr(k: string) { setErrors((prev) => { const { [k]: _, ...rest } = prev; return rest; }); }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSave() {
    if (!validate()) return;
    trigger(() => api.put('/profile/me/patient', {
      name,
      phone,
      dateOfBirth: birthDate || undefined,
      address: (city || state || cep) ? { city: city || undefined, state: state || undefined, zipCode: cep || undefined } : undefined,
    }).then(() => {}));
  }

  return (
    <SectionCard title="Perfil do paciente" description="Seus dados pessoais e de contato.">
      <TextField label="Nome completo" icon={User} value={name} onChange={(v) => { setName(v); clr('name'); }} error={errors.name} placeholder="Seu nome completo" />
      <TextField label="E-mail" icon={Mail} type="email" value={data.email ?? ''} onChange={() => {}} readOnly badge="não editável" />
      <div className="grid md:grid-cols-2 gap-4">
        <TextField label="Celular" icon={Phone} value={phone} onChange={setPhone} placeholder="(11) 99999-9999" />
        <label className="block">
          <FieldLabel>Data de nascimento</FieldLabel>
          <div className="relative">
            <IconWrap icon={Calendar} />
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={ic()}
            />
          </div>
        </label>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <SelectField label="Gênero" icon={User} value={gender} onChange={setGender} options={GENDERS} />
        <TextField label="Pronomes (opcional)" icon={FileText} value={pronouns} onChange={setPronouns} placeholder="ex: ela/dela" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <TextField label="CEP" icon={MapPin} value={cep} onChange={setCep} placeholder="00000-000" />
        <div className="md:col-span-1">
          <TextField label="Cidade" icon={MapPin} value={city} onChange={setCity} placeholder="São Paulo" />
        </div>
        <TextField label="Estado" icon={MapPin} value={state} onChange={setState} placeholder="SP" />
      </div>
      <SaveRow saving={saving} saved={saved} error={saveError} onSave={handleSave} />
    </SectionCard>
  );
}

function AttendantClinicSection({ data }: { data: any }) {
  const [clinicId, setClinicId] = useState(data.clinicId ?? '');
  const [error, setError] = useState('');
  const { saving, saved, saveError, trigger } = useSave();

  function handleSave() {
    if (!clinicId.trim()) { setError('Informe o código da clínica'); return; }
    setError('');
    trigger(() => api.put('/settings', { clinicId: clinicId.trim() }).then(() => {}));
  }

  return (
    <SectionCard
      title="Vínculo com a clínica"
      description="Insira o código fornecido pelo gestor da clínica para vincular sua conta."
    >
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-[#CAF0F8]/40 border border-[#90E0EF]/60">
        <Hash size={16} className="text-[#0077B6] mt-0.5 shrink-0" />
        <p className="text-sm text-[#03045E]">
          Solicite o código de acesso ao gestor responsável pela clínica onde você trabalha.
          Após vincular, você terá acesso à agenda e aos agendamentos da clínica.
        </p>
      </div>
      <label className="block">
        <FieldLabel>Código da clínica</FieldLabel>
        <div className="relative">
          <IconWrap icon={Building2} error={error} />
          <input
            type="text"
            value={clinicId}
            onChange={(e) => { setClinicId(e.target.value); setError(''); }}
            placeholder="Ex.: clinic-001"
            className={ic(error)}
          />
        </div>
        <FieldErr msg={error} />
      </label>
      {data.clinicId && (
        <p className="text-xs text-[#10B981] font-semibold flex items-center gap-1.5">
          <Check size={13} /> Atualmente vinculado a: <span className="font-mono">{data.clinicId}</span>
        </p>
      )}
      <SaveRow saving={saving} saved={saved} error={saveError} onSave={handleSave} />
    </SectionCard>
  );
}

// ─── loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-52 bg-white border border-[#E2E8F0] rounded-3xl animate-pulse" />
      ))}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'clinic';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authFallback = { name: user?.name ?? '', email: user?.email ?? '' };
    api.get('/profile/me')
      .then(({ data: d }) => setData({
        ...authFallback,
        ...(d ?? {}),
        city:    d?.address?.city     ?? d?.city    ?? '',
        state:   d?.address?.state    ?? d?.state   ?? '',
        cep:     d?.address?.zipCode  ?? d?.cep     ?? '',
        address: d?.address
          ? [d.address.street, d.address.city, d.address.state].filter(Boolean).join(', ')
          : (d?.address ?? ''),
        birthDate: d?.dateOfBirth ?? d?.birthDate ?? '',
      }))
      .catch(() => setData(authFallback))
      .finally(() => setLoading(false));
  }, [role]);

  // ── patient layout ────────────────────────────────────────────────────────

  if (role === 'patient') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]" style={font}>
        <PatientTopbar />
        <main className="flex-1 max-w-[720px] w-full mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Meu perfil</h1>
            <p className="text-[#64748B] mt-1 text-sm">Gerencie seus dados pessoais.</p>
          </div>
          {loading || !data ? <Skeleton count={1} /> : <PatientProfileSection key={data._id ?? data.id ?? 'patient'} data={data} />}
        </main>
        <AppFooter />
      </div>
    );
  }

  // ── dashboard layout (clinic / professional / attendant) ─────────────────

  const skeletonCount = role === 'clinic' ? 4 : role === 'attendant' ? 1 : 3;

  const subtitle =
    role === 'clinic' ? 'Gerencie os dados e preferências da sua clínica.' :
    role === 'attendant' ? 'Vincule sua conta à clínica onde você trabalha.' :
    'Gerencie seus dados e preferências de atendimento.';

  return (
    <DashboardLayout>
      <div className="mb-8" style={font}>
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Configurações</h1>
        <p className="text-[#64748B] mt-1 text-sm">{subtitle}</p>
      </div>

      {loading || !data ? (
        <Skeleton count={skeletonCount} />
      ) : (
        <div className="space-y-6" key={data._id ?? data.id ?? 'profile'}>
          {role === 'clinic' && (
            <>
              <ClinicDataSection data={data} />
              <ClinicCodeSection data={data} />
              <AttendantConfigSection data={data} />
              <NotificationsSection data={data} />
              <AppointmentPrefsSection data={data} />
            </>
          )}
          {role === 'professional' && (
            <>
              <ProfessionalDataSection data={data} />
              <NotificationsSection data={data} />
              <AppointmentPrefsSection data={data} />
            </>
          )}
          {role === 'attendant' && (
            <AttendantClinicSection data={data} />
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
