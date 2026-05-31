import {
  AlertTriangle,
  Bell,
  BookOpen,
  Building,
  Calendar,
  Clock,
  FileText,
  Globe,
  Hash,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  User,
  Users,
} from 'lucide-react';
import { Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import useSWR from 'swr';

import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Page } from '@/app/components/ui/Page';
import { Section } from '@/app/components/ui/Section';
import { Spinner } from '@/app/components/ui/Spinner';
import { TextField } from '@/app/components/ui/TextField';
import { AddressAutocomplete } from '@/app/components/ui/AddressAutocomplete';
import { useAsyncAction } from '@/app/lib/hooks';
import { api, phoneMask } from '@/app/lib/utils';
import { SPECIALTY_LABELS } from '@/app/utils/specialtyLabels';

interface ClinicProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  website?: string;
  hours?: string;
  addressText?: string;
  city?: string;
  customCode?: string;
  allowConsecutiveAttendants?: boolean;
  notifyEmail?: boolean;
  notifySms?: boolean;
  autoConfirm?: boolean;
}

interface ProfessionalProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  specialty?: string;
  autoConfirm?: boolean;
}

interface PatientProfile {
  _id: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  pronouns?: string;
  cep?: string;
  city?: string;
  state?: string;
}


const GENDER_LABELS: Record<string, string> = {
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  NON_BINARY: 'Não-binário',
  OTHER: 'Outro',
  PREFER_NOT_TO_SAY: 'Prefiro não informar',
};

const PRONOUNS_LABELS: Record<string, string> = {
  SHE: 'ela/dela',
  HE: 'ele/dele',
  THEY: 'eles/deles',
};

function Toggle({
  title,
  description,
  icon: Icon,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-muted p-4">
      {Icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00B4D8]/10">
          <Icon size={16} className="text-[#00B4D8]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-foreground-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground-muted">
        {label}
      </span>
      <div className="relative">
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
        />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-border bg-white pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Selecione…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function SaveFooter({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
      <p className="text-xs text-foreground-muted">
        As alterações entram em vigor imediatamente.
      </p>
      <Button onClick={onClick} loading={loading}>
        Salvar alterações
      </Button>
    </div>
  );
}

// ─── Clinic sections ──────────────────────────────────────────────────────────

function formatCnpj(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function ClinicDataSection() {
  const { data: rawData, mutate } = useSWR<ClinicProfile>('/profile/me/clinic', {
    suspense: true,
  });
  const data = rawData!;
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [name, setName] = useState(data.name ?? '');
  const [email, setEmail] = useState(data.email ?? '');
  const [phone, setPhone] = useState(data.phone ? phoneMask(data.phone) : '');
  const [cnpj, setCnpj] = useState(data.cnpj ? formatCnpj(data.cnpj) : '');
  const [website, setWebsite] = useState(data.website ?? '');
  const [addressText, setAddressText] = useState(data.addressText ?? '');
  const [city, setCity] = useState(data.city ?? '');
  const [hours, setHours] = useState(data.hours ?? '');

  function handleSave() {
    const effectiveName = name.trim() || data.name;
    const effectiveEmail = email || data.email;
    const effectivePhone = (phone || data.phone || '').replace(/\D/g, '');
    const effectiveCnpj = (cnpj || formatCnpj(data.cnpj ?? '')).replace(/\D/g, '');
    const effectiveWebsite = website || data.website;
    const effectiveAddress = addressText || data.addressText;
    const effectiveHours = hours || data.hours;

    if (!effectiveName) {
      toast.error('O nome da clínica é obrigatório.');
      return;
    }
    if (effectiveEmail && !/\S+@\S+\.\S+/.test(effectiveEmail)) {
      toast.error('Por favor, informe um e-mail válido.');
      return;
    }
    if (effectiveCnpj && effectiveCnpj.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos.');
      return;
    }
    const effectiveCity = city || data.city;
    trigger(() =>
      api
        .put('/profile/me/clinic', {
          name: effectiveName,
          email: effectiveEmail || undefined,
          phone: effectivePhone || undefined,
          cnpj: effectiveCnpj || undefined,
          website: effectiveWebsite || undefined,
          addressText: effectiveAddress || undefined,
          city: effectiveCity || undefined,
          hours: effectiveHours || undefined,
        })
        .then(() => {
          toast.success('Dados da clínica atualizados!');
          mutate();
        }),
    );
  }

  return (
    <Section title="Dados da clínica" description="Informações exibidas no perfil público.">
      <div className="space-y-4">
        <TextField
          label="Nome da clínica"
          icon={Building}
          value={name}
          onChange={setName}
          placeholder="Razão social ou nome fantasia"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="E-mail"
            icon={Mail}
            value={email}
            onChange={setEmail}
            placeholder="contato@clinica.com"
            type="email"
          />
          <TextField
            label="Telefone"
            icon={Phone}
            value={phone}
            onChange={(v) => setPhone(phoneMask(v))}
            placeholder="(11) 3456-7890"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="CNPJ"
            icon={FileText}
            value={cnpj}
            onChange={(v) => setCnpj(formatCnpj(v))}
            placeholder="00.000.000/0000-00"
          />
          <TextField
            label="Site"
            icon={Globe}
            value={website}
            onChange={setWebsite}
            placeholder="clinica.com.br"
          />
        </div>
        <AddressAutocomplete
          value={addressText}
          onChange={setAddressText}
          onSelect={(s) => setCity(s.city)}
          placeholder="Av. Exemplo, 123 – Cidade, UF"
        />
        <TextField
          label="Horário de funcionamento"
          icon={Clock}
          value={hours}
          onChange={setHours}
          placeholder="Seg–Sex: 08h–18h | Sáb: 08h–13h"
        />
      </div>
      <SaveFooter onClick={handleSave} loading={isMutating} />
    </Section>
  );
}

function ClinicCodeSection() {
  const { data: rawData, mutate } = useSWR<ClinicProfile>('/profile/me/clinic', {
    suspense: true,
  });
  const data = rawData!;
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [customCode, setCustomCode] = useState(data.customCode ?? '');

  function handleSave() {
    if (customCode && !/^[a-zA-Z0-9_-]{3,30}$/.test(customCode)) {
      toast.error('Use apenas letras, números, hífen ou underscore (3–30 caracteres).');
      return;
    }
    trigger(() =>
      api
        .put('/profile/me/clinic', { customCode: customCode || undefined })
        .then(() => {
          toast.success('Código da clínica atualizado!');
          mutate();
        }),
    );
  }

  return (
    <Section
      title="Código da clínica"
      description="Defina um código único que profissionais e atendentes usam para se vincular à sua clínica."
    >
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-[#00B4D8]/10 px-4 py-3 text-sm text-[#03045E]">
        <Hash size={15} className="mt-0.5 shrink-0 text-[#00B4D8]" />
        <span>
          Compartilhe este código com os profissionais e atendentes que deseja vincular à
          clínica. Eles informarão este código ao criar ou acessar a conta.
        </span>
      </div>
      <TextField
        label="Código personalizado"
        icon={Hash}
        value={customCode}
        onChange={setCustomCode}
        placeholder="Ex.: saude-total, clinica123"
      />
      <p className="mt-1.5 text-xs text-foreground-muted">
        Somente letras, números, hífen e underscore. Entre 3 e 30 caracteres.
      </p>
      <SaveFooter onClick={handleSave} loading={isMutating} />
    </Section>
  );
}

function AttendantSettingsSection() {
  const { data: rawData, mutate } = useSWR<ClinicProfile>('/profile/me/clinic', {
    suspense: true,
  });
  const data = rawData!;
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [allowConsecutive, setAllowConsecutive] = useState(
    data.allowConsecutiveAttendants ?? false,
  );

  function handleSave() {
    trigger(() =>
      api
        .put('/profile/me/clinic', { allowConsecutiveAttendants: allowConsecutive })
        .then(() => {
          toast.success('Configuração de atendentes atualizada!');
          mutate();
        }),
    );
  }

  return (
    <Section
      title="Configuração de atendentes"
      description="Defina como os atendentes operam a agenda."
    >
      <Toggle
        title="Permitir agendamentos consecutivos sem intervalo entre atendentes"
        description="Quando ativo, consultas seguidas não geram bloqueio de intervalo no sistema."
        icon={Users}
        checked={allowConsecutive}
        onChange={setAllowConsecutive}
      />
      <SaveFooter onClick={handleSave} loading={isMutating} />
    </Section>
  );
}

function NotificationsSection() {
  const { data: rawData, mutate } = useSWR<ClinicProfile>('/profile/me/clinic', {
    suspense: true,
  });
  const data = rawData!;
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [notifyEmail, setNotifyEmail] = useState(data.notifyEmail ?? true);
  const [notifySms, setNotifySms] = useState(data.notifySms ?? false);

  function handleSave() {
    trigger(() =>
      api
        .put('/profile/me/clinic', { notifyEmail, notifySms })
        .then(() => {
          toast.success('Preferências de notificações atualizadas!');
          mutate();
        }),
    );
  }

  return (
    <Section
      title="Notificações"
      description="Escolha como deseja receber avisos sobre agendamentos."
    >
      <div className="space-y-3">
        <Toggle
          title="Notificações por e-mail"
          description="Receber confirmações e lembretes por e-mail."
          icon={Mail}
          checked={notifyEmail}
          onChange={setNotifyEmail}
        />
        <Toggle
          title="Notificações por SMS"
          description="Receber lembretes via mensagem de texto."
          icon={Bell}
          checked={notifySms}
          onChange={setNotifySms}
        />
      </div>
      <SaveFooter onClick={handleSave} loading={isMutating} />
    </Section>
  );
}

function ClinicAppointmentSection() {
  const { data: rawData, mutate } = useSWR<ClinicProfile>('/profile/me/clinic', {
    suspense: true,
  });
  const data = rawData!;
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [autoConfirm, setAutoConfirm] = useState(data.autoConfirm ?? false);

  function handleSave() {
    trigger(() =>
      api.put('/profile/me/clinic', { autoConfirm }).then(() => {
        toast.success('Preferências de agendamento atualizadas!');
        mutate();
      }),
    );
  }

  return (
    <Section
      title="Preferências de agendamento"
      description="Defina o comportamento padrão da agenda."
    >
      <Toggle
        title="Confirmar agendamentos automaticamente"
        description="Novos agendamentos serão marcados como confirmados sem revisão manual."
        icon={Clock}
        checked={autoConfirm}
        onChange={setAutoConfirm}
      />
      <SaveFooter onClick={handleSave} loading={isMutating} />
    </Section>
  );
}

// ─── Danger zone ─────────────────────────────────────────────────────────────

function DangerZoneSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    try {
      await api.delete('/profile/me');
      toast.success('Conta excluída com sucesso.');
      await logout();
      navigate('/login');
    } catch {
      toast.error('Não foi possível excluir a conta. Tente novamente.');
      setLoading(false);
    }
  }, [logout, navigate]);

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-red-600">Excluir conta</h2>
      <p className="mb-6 text-sm text-foreground-muted">
        Ações irreversíveis que afetam permanentemente a sua conta.
      </p>

      {!confirming ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-100 bg-red-50 p-4">
          <div>
            <p className="font-medium text-red-700">Excluir esta conta</p>
            <p className="text-sm text-red-500">
              Todos os dados serão desativados e você perderá o acesso permanentemente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Excluir conta
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-4 flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-700">Tem certeza absoluta?</p>
              <p className="mt-0.5 text-sm text-red-500">
                Esta ação não pode ser desfeita. Sua conta será desativada imediatamente e
                você perderá o acesso a todos os dados.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground-muted transition hover:bg-surface-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Excluindo…' : 'Sim, excluir conta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Professional sections ────────────────────────────────────────────────────

function ProfessionalDataSection() {
  const { data: rawProfData, mutate } = useSWR<ProfessionalProfile>('/profile/me/professional', {
    suspense: true,
  });
  const data = rawProfData!;
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [name, setName] = useState(data.name ?? '');
  const [email, setEmail] = useState(data.email ?? '');
  const [phone, setPhone] = useState(data.phone ?? '');
  const [bio, setBio] = useState(data.bio ?? '');
  const [specialty, setSpecialty] = useState(data.specialty ?? '');

  function handleSave() {
    if (!name.trim()) {
      toast.error('O nome é obrigatório.');
      return;
    }
    trigger(() =>
      api
        .put('/profile/me/professional', {
          name,
          email: email || undefined,
          phone: phone.replace(/\D/g, '') || undefined,
          bio: bio || undefined,
          specialty: specialty || undefined,
        })
        .then(() => {
          toast.success('Dados atualizados!');
          mutate();
        }),
    );
  }

  return (
    <Section title="Dados do profissional">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Nome completo"
          icon={User}
          value={name}
          onChange={setName}
          placeholder="Dr(a). Seu Nome"
        />
        <TextField
          label="Email"
          icon={Mail}
          value={email}
          onChange={setEmail}
          placeholder="seu@email.com.br"
          type="email"
        />
        <TextField
          label="Telefone"
          icon={Phone}
          value={phone}
          onChange={(v) => setPhone(phoneMask(v))}
          placeholder="(11) 99999-9999"
        />
        <SelectField
          label="Especialidade"
          icon={Stethoscope}
          value={specialty}
          onChange={setSpecialty}
          options={Object.entries(SPECIALTY_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <TextField
          label="Bio"
          icon={BookOpen}
          value={bio}
          onChange={setBio}
          placeholder="Conte um pouco sobre você"
          className="md:col-span-2"
        />
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} loading={isMutating}>
          Salvar alterações
        </Button>
      </div>
    </Section>
  );
}

function ProfessionalAppointmentSection() {
  const { data: rawProfData2, mutate } = useSWR<ProfessionalProfile>(
    '/profile/me/professional',
    { suspense: true },
  );
  const data = rawProfData2!;
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [autoConfirm, setAutoConfirm] = useState(data.autoConfirm ?? false);

  function handleSave() {
    trigger(() =>
      api.put('/profile/me/professional', { autoConfirm }).then(() => {
        toast.success('Preferências de agendamento atualizadas!');
        mutate();
      }),
    );
  }

  return (
    <Section title="Preferências de agendamento">
      <Toggle
        title="Confirmar agendamentos automaticamente"
        description="Novos agendamentos são marcados como confirmados sem revisão manual."
        checked={autoConfirm}
        onChange={setAutoConfirm}
      />
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} loading={isMutating}>
          Salvar alterações
        </Button>
      </div>
    </Section>
  );
}

// ─── Patient section ──────────────────────────────────────────────────────────

function PatientProfileSection() {
  const { user } = useAuth();
  const { data: rawPatientData, mutate } = useSWR<PatientProfile>('/profile/me/patient', {
    suspense: true,
  });
  const data = rawPatientData!;
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [name, setName] = useState(data.name ?? '');
  const [phone, setPhone] = useState(data.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(
    data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
  );
  const [gender, setGender] = useState(data.gender ?? '');
  const [pronouns, setPronouns] = useState(data.pronouns ?? '');
  const [cep, setCep] = useState(data.cep ?? '');
  const [city, setCity] = useState(data.city ?? '');
  const [state, setState] = useState(data.state ?? '');

  function handleSave() {
    if (!name.trim()) {
      toast.error('O nome é obrigatório.');
      return;
    }
    trigger(() =>
      api
        .put('/profile/me/patient', {
          name,
          phone: phone.replace(/\D/g, '') || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          pronouns: pronouns || undefined,
          cep: cep || undefined,
          city: city || undefined,
          state: state || undefined,
        })
        .then(() => {
          toast.success('Perfil atualizado!');
          mutate();
        }),
    );
  }

  return (
    <Section title="Meus dados">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Nome completo"
          icon={User}
          value={name}
          onChange={setName}
          placeholder="Seu nome completo"
        />
        <TextField
          label="Email"
          icon={Mail}
          defaultValue={user?.email ?? ''}
          readOnly
        />
        <TextField
          label="Celular"
          icon={Phone}
          value={phone}
          onChange={(v) => setPhone(phoneMask(v))}
          placeholder="(11) 99999-9999"
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground-muted">
            Data de nascimento
          </span>
          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            />
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-white pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </label>
        <SelectField
          label="Gênero"
          icon={User}
          value={gender}
          onChange={setGender}
          options={Object.entries(GENDER_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <SelectField
          label="Pronomes"
          icon={FileText}
          value={pronouns}
          onChange={setPronouns}
          options={Object.entries(PRONOUNS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <TextField
          label="CEP"
          icon={MapPin}
          value={cep}
          onChange={setCep}
          placeholder="00000-000"
        />
        <TextField
          label="Cidade"
          icon={MapPin}
          value={city}
          onChange={setCity}
          placeholder="São Paulo"
        />
        <TextField
          label="Estado"
          icon={MapPin}
          value={state}
          onChange={setState}
          placeholder="SP"
        />
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} loading={isMutating}>
          Salvar alterações
        </Button>
      </div>
    </Section>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSection({ title }: { title: string }) {
  return (
    <Section title={title}>
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'clinic';

  if (role === 'clinic') {
    return (
      <Page title="Configurações" description="Gerencie os dados e preferências da sua clínica.">
        <div className="space-y-8">
          <Suspense fallback={<LoadingSection title="Dados da clínica" />}>
            <ClinicDataSection />
          </Suspense>
          <Suspense fallback={<LoadingSection title="Código da clínica" />}>
            <ClinicCodeSection />
          </Suspense>
          <Suspense fallback={<LoadingSection title="Configuração de atendentes" />}>
            <AttendantSettingsSection />
          </Suspense>
          <Suspense fallback={<LoadingSection title="Notificações" />}>
            <NotificationsSection />
          </Suspense>
          <Suspense fallback={<LoadingSection title="Preferências de agendamento" />}>
            <ClinicAppointmentSection />
          </Suspense>
          <DangerZoneSection />
        </div>
      </Page>
    );
  }

  if (role === 'professional') {
    return (
      <Page title="Configurações">
        <div className="space-y-8">
          <Suspense fallback={<LoadingSection title="Dados do profissional" />}>
            <ProfessionalDataSection />
          </Suspense>
          <Suspense fallback={<LoadingSection title="Preferências de agendamento" />}>
            <ProfessionalAppointmentSection />
          </Suspense>
        </div>
      </Page>
    );
  }

  if (role === 'patient') {
    return (
      <Page title="Meu perfil">
        <div className="space-y-8">
          <Suspense fallback={<LoadingSection title="Meus dados" />}>
            <PatientProfileSection />
          </Suspense>
        </div>
      </Page>
    );
  }

  // attendant — sem configurações editáveis por ora
  return (
    <Page title="Configurações">
      <Section title="Sua conta">
        <div className="space-y-2 text-sm text-foreground-muted">
          <p>
            <span className="font-medium text-foreground">Usuário:</span>{' '}
            {user?.username ?? '—'}
          </p>
          <p>
            <span className="font-medium text-foreground">Clínica:</span>{' '}
            {user?.clinicId ?? '—'}
          </p>
        </div>
      </Section>
    </Page>
  );
}
