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
  X,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useState, useCallback, useEffect } from 'react';
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
  cpf?: string;
  autoConfirm?: boolean;
}

interface PatientProfile {
  _id: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  sex?: string;
  gender?: string;
  cep?: string;
  city?: string;
  state?: string;
}

// Sexo biológico e gênero — relevantes para diagnóstico; ambos opcionais.
const SEX_OPTIONS = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'INTERSEX', label: 'Intersexo' },
];

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outros' },
];

function formatCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

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
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          checked ? 'border-primary bg-primary' : 'border-slate-400 bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${
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

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function ClinicDataSection() {
  const { updateUser } = useAuth();
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

  useEffect(() => {
    setName(data.name ?? '');
    setEmail(data.email ?? '');
    setPhone(data.phone ? phoneMask(data.phone) : '');
    setCnpj(data.cnpj ? formatCnpj(data.cnpj) : '');
    setWebsite(data.website ?? '');
    setAddressText(data.addressText ?? '');
    setCity(data.city ?? '');
    setHours(data.hours ?? '');
  }, [data]);

  function handleSave() {
    const trimmedName = name.trim();
    const rawPhone = phone.replace(/\D/g, '');
    const rawCnpj = cnpj.replace(/\D/g, '');

    if (!trimmedName) {
      toast.error('O nome da clínica é obrigatório.');
      return;
    }
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Por favor, informe um e-mail válido.');
      return;
    }
    if (rawCnpj && rawCnpj.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos.');
      return;
    }
    trigger(() =>
      api
        .put('/profile/me/clinic', {
          name: trimmedName,
          email: email || undefined,
          phone: rawPhone || undefined,
          cnpj: rawCnpj || undefined,
          website: website || undefined,
          addressText: addressText || undefined,
          city: city || undefined,
          hours: hours || undefined,
        })
        .then(() => {
          toast.success('Dados da clínica atualizados!');
          updateUser({ name: trimmedName, email: email || undefined });
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
  const { updateUser } = useAuth();
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
          updateUser({ name: name.trim(), email: email || undefined });
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
          label="CPF"
          icon={FileText}
          defaultValue={data.cpf ? formatCpf(data.cpf) : ''}
          placeholder="Não informado"
          readOnly
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
  const [cep, setCep] = useState(data.cep ? formatCep(data.cep) : '');
  const [city, setCity] = useState(data.city ?? '');
  const [state, setState] = useState(data.state ?? '');
  const [cepLoading, setCepLoading] = useState(false);

  // Ao completar 8 dígitos, busca cidade/estado pelo CEP (ViaCEP).
  async function handleCepChange(v: string) {
    const masked = formatCep(v);
    setCep(masked);
    const digits = masked.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const via = await res.json();
      if (!via.erro) {
        if (via.localidade) setCity(via.localidade);
        if (via.uf) setState(via.uf);
      }
    } catch {
      /* lookup de CEP é best-effort; ignora falha de rede */
    } finally {
      setCepLoading(false);
    }
  }

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
          cep: cep.replace(/\D/g, '') || undefined,
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
        <TextField
          label={cepLoading ? 'CEP (buscando…)' : 'CEP'}
          icon={MapPin}
          value={cep}
          onChange={handleCepChange}
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

// Opções dos enums do perfil clínico (valores batem com @medicano/types).
const SMOKING_OPTIONS = [
  { value: 'never', label: 'Nunca fumou' },
  { value: 'former', label: 'Ex-fumante' },
  { value: 'current', label: 'Fumante atual' },
];
const ALCOHOL_OPTIONS = [
  { value: 'never', label: 'Não consome' },
  { value: 'social', label: 'Social' },
  { value: 'regular', label: 'Regular' },
];
const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentário' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderada' },
  { value: 'intense', label: 'Intensa' },
];
const IMMUNE_OPTIONS = [
  { value: 'competent', label: 'Imunocompetente' },
  { value: 'suppressed', label: 'Imunossuprimido' },
];
const LANGUAGE_OPTIONS = [
  { value: 'technical', label: 'Técnica' },
  { value: 'accessible', label: 'Acessível (linguagem simples)' },
];

const splitList = (s: string): string[] =>
  s.split(',').map((v) => v.trim()).filter(Boolean);
const joinList = (a?: string[]): string => (a ?? []).join(', ');
const numOrUndef = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
};

interface RichProfile {
  useInAssistant?: boolean;
  preferredName?: string;
  heightCm?: number;
  weightKg?: number;
  isPregnant?: boolean;
  gestationalWeeks?: number;
  chronicConditions?: string[];
  medications?: { name: string; dose?: string }[];
  allergies?: { substance: string; reaction?: string }[];
  previousSurgeries?: string[];
  familyHistory?: string[];
  smokingStatus?: string;
  alcoholUse?: string;
  activityLevel?: string;
  immuneStatus?: string;
  recentTravelCountries?: string[];
  animalExposure?: string[];
  languageLevel?: string;
  observations?: string;
}

// Campo de lista separada por vírgula.
function ListField({
  label, icon, value, onChange, placeholder,
}: {
  label: string; icon: LucideIcon; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="md:col-span-2">
      <TextField label={label} icon={icon} value={value} onChange={onChange} placeholder={placeholder} />
      <p className="mt-1 text-xs text-foreground-muted">Separe por vírgula.</p>
    </div>
  );
}

// Editor de linhas para listas de objetos (medicações, alergias).
function RowsEditor<T extends Record<string, string>>({
  label, rows, onChange, fields, empty,
}: {
  label: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  fields: { key: keyof T; placeholder: string }[];
  empty: T;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-foreground-muted">{label}</span>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {fields.map((f) => (
              <input
                key={String(f.key)}
                value={row[f.key]}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, [f.key]: e.target.value } as T;
                  onChange(next);
                }}
                placeholder={f.placeholder}
                className="h-10 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            ))}
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg p-2 text-foreground-muted hover:text-red-500"
              aria-label="Remover"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...rows, { ...empty }])}
          className="text-sm font-semibold text-[#0077B6] hover:text-[#023E8A]"
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}

function PatientContextSection() {
  const { data: rawPatientData, mutate } = useSWR<PatientProfile>('/profile/me/patient', {
    suspense: true,
  });
  const { data: rawRich, mutate: mutateRich } = useSWR<RichProfile | null>('/patient-profile', {
    suspense: true,
  });
  const data = rawPatientData!;
  const rich = rawRich ?? {};
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [dateOfBirth, setDateOfBirth] = useState(
    data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
  );
  const [sex, setSex] = useState(data.sex ?? '');
  const [gender, setGender] = useState(data.gender ?? '');

  // Perfil clínico rico (patient-profile)
  const [useInAssistant, setUseInAssistant] = useState(rich.useInAssistant ?? false);
  const [preferredName, setPreferredName] = useState(rich.preferredName ?? '');
  const [heightCm, setHeightCm] = useState(rich.heightCm != null ? String(rich.heightCm) : '');
  const [weightKg, setWeightKg] = useState(rich.weightKg != null ? String(rich.weightKg) : '');
  const [isPregnant, setIsPregnant] = useState(rich.isPregnant ?? false);
  const [gestationalWeeks, setGestationalWeeks] = useState(
    rich.gestationalWeeks != null ? String(rich.gestationalWeeks) : '',
  );
  const [chronicConditions, setChronicConditions] = useState(joinList(rich.chronicConditions));
  const [previousSurgeries, setPreviousSurgeries] = useState(joinList(rich.previousSurgeries));
  const [familyHistory, setFamilyHistory] = useState(joinList(rich.familyHistory));
  const [recentTravel, setRecentTravel] = useState(joinList(rich.recentTravelCountries));
  const [animalExposure, setAnimalExposure] = useState(joinList(rich.animalExposure));
  const [smokingStatus, setSmokingStatus] = useState(rich.smokingStatus ?? '');
  const [alcoholUse, setAlcoholUse] = useState(rich.alcoholUse ?? '');
  const [activityLevel, setActivityLevel] = useState(rich.activityLevel ?? '');
  const [immuneStatus, setImmuneStatus] = useState(rich.immuneStatus ?? '');
  const [languageLevel, setLanguageLevel] = useState(rich.languageLevel ?? '');
  const [observations, setObservations] = useState(rich.observations ?? '');
  const [medications, setMedications] = useState<{ name: string; dose: string }[]>(
    (rich.medications ?? []).map((m) => ({ name: m.name, dose: m.dose ?? '' })),
  );
  const [allergies, setAllergies] = useState<{ substance: string; reaction: string }[]>(
    (rich.allergies ?? []).map((a) => ({ substance: a.substance, reaction: a.reaction ?? '' })),
  );

  function handleSave() {
    const richPayload = {
      useInAssistant,
      preferredName: preferredName || undefined,
      heightCm: numOrUndef(heightCm),
      weightKg: numOrUndef(weightKg),
      isPregnant,
      gestationalWeeks: isPregnant ? numOrUndef(gestationalWeeks) : undefined,
      chronicConditions: splitList(chronicConditions),
      previousSurgeries: splitList(previousSurgeries),
      familyHistory: splitList(familyHistory),
      recentTravelCountries: splitList(recentTravel),
      animalExposure: splitList(animalExposure),
      smokingStatus: smokingStatus || undefined,
      alcoholUse: alcoholUse || undefined,
      activityLevel: activityLevel || undefined,
      immuneStatus: immuneStatus || undefined,
      languageLevel: languageLevel || undefined,
      observations: observations || undefined,
      medications: medications
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name.trim(), dose: m.dose.trim() || undefined })),
      allergies: allergies
        .filter((a) => a.substance.trim())
        .map((a) => ({ substance: a.substance.trim(), reaction: a.reaction.trim() || undefined })),
    };
    trigger(() =>
      Promise.all([
        api.put('/profile/me/patient', {
          dateOfBirth: dateOfBirth || undefined,
          sex: sex || undefined,
          gender: gender || undefined,
        }),
        api.patch('/patient-profile', richPayload),
      ]).then(() => {
        toast.success('Informações de contexto atualizadas!');
        mutate();
        mutateRich();
      }),
    );
  }

  return (
    <Section
      title="Informações de contexto"
      description="Opcionais. Usadas apenas para dar mais contexto à ferramenta de IA durante o atendimento do assistente, ajudando a sugerir a especialidade mais adequada. Você pode deixá-las em branco."
    >
      <div className="mb-6">
        <Toggle
          title="Usar meu perfil clínico no assistente"
          description="Quando ativo, a IA usa as informações abaixo como contexto clínico. Tudo opcional."
          icon={Stethoscope}
          checked={useInAssistant}
          onChange={setUseInAssistant}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <SelectField label="Sexo" icon={User} value={sex} onChange={setSex} options={SEX_OPTIONS} />
        <SelectField label="Gênero" icon={Users} value={gender} onChange={setGender} options={GENDER_OPTIONS} />
      </div>

      {/* ── Perfil clínico (opcional; usado pelo assistente se autorizado) ── */}
      <div className="mt-6 space-y-4 border-t border-border pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Como prefere ser chamado(a)" icon={User} value={preferredName} onChange={setPreferredName} placeholder="Nome social / apelido" />
          <TextField label="Altura (cm)" icon={User} value={heightCm} onChange={setHeightCm} placeholder="170" />
          <TextField label="Peso (kg)" icon={User} value={weightKg} onChange={setWeightKg} placeholder="70" />
          <SelectField label="Tabagismo" icon={Bell} value={smokingStatus} onChange={setSmokingStatus} options={SMOKING_OPTIONS} />
          <SelectField label="Consumo de álcool" icon={Bell} value={alcoholUse} onChange={setAlcoholUse} options={ALCOHOL_OPTIONS} />
          <SelectField label="Atividade física" icon={Clock} value={activityLevel} onChange={setActivityLevel} options={ACTIVITY_OPTIONS} />
          <SelectField label="Imunidade" icon={Stethoscope} value={immuneStatus} onChange={setImmuneStatus} options={IMMUNE_OPTIONS} />
          <SelectField label="Preferência de linguagem" icon={BookOpen} value={languageLevel} onChange={setLanguageLevel} options={LANGUAGE_OPTIONS} />
        </div>

        <Toggle
          title="Gestante"
          description="Marque se estiver grávida."
          icon={User}
          checked={isPregnant}
          onChange={setIsPregnant}
        />
        {isPregnant && (
          <div className="grid grid-cols-1 md:grid-cols-2">
            <TextField label="Semanas de gestação" icon={Calendar} value={gestationalWeeks} onChange={setGestationalWeeks} placeholder="Ex.: 12" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ListField label="Condições crônicas" icon={Stethoscope} value={chronicConditions} onChange={setChronicConditions} placeholder="Hipertensão, diabetes" />
          <ListField label="Cirurgias anteriores" icon={FileText} value={previousSurgeries} onChange={setPreviousSurgeries} placeholder="Apendicectomia (2019)" />
          <ListField label="Histórico familiar" icon={Users} value={familyHistory} onChange={setFamilyHistory} placeholder="Câncer de mama (mãe)" />
          <ListField label="Países visitados recentemente" icon={Globe} value={recentTravel} onChange={setRecentTravel} placeholder="Argentina, Chile" />
          <ListField label="Exposição a animais" icon={MapPin} value={animalExposure} onChange={setAnimalExposure} placeholder="Gato, cachorro" />
        </div>

        <RowsEditor
          label="Medicações em uso"
          rows={medications}
          onChange={setMedications}
          fields={[
            { key: 'name', placeholder: 'Medicamento' },
            { key: 'dose', placeholder: 'Dose (ex.: 50mg)' },
          ]}
          empty={{ name: '', dose: '' }}
        />

        <RowsEditor
          label="Alergias"
          rows={allergies}
          onChange={setAllergies}
          fields={[
            { key: 'substance', placeholder: 'Substância' },
            { key: 'reaction', placeholder: 'Reação (ex.: urticária)' },
          ]}
          empty={{ substance: '', reaction: '' }}
        />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground-muted">Observações</span>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Qualquer informação adicional relevante para o assistente."
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
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
      <Page title="Meu perfil" backTo="/home">
        <div className="space-y-8">
          <Suspense fallback={<LoadingSection title="Meus dados" />}>
            <PatientProfileSection />
          </Suspense>
          <Suspense fallback={<LoadingSection title="Informações de contexto" />}>
            <PatientContextSection />
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
