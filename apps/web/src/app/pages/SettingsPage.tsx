import {
  Building,
  Clock,
  FileText,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

import { Button } from '@/app/components/ui/Button';
import { Page } from '@/app/components/ui/Page';
import { Section } from '@/app/components/ui/Section';
import { Spinner } from '@/app/components/ui/Spinner';
import { TextField } from '@/app/components/ui/TextField';
import { useAsyncAction } from '@/app/lib/hooks';
import { api, phoneMask } from '@/app/lib/utils';
import type { ClinicProfile, UserProfile } from '@medicano/types';

function PersonalDataSection() {
  const { data } = useSWR<UserProfile>('/profile/me', { suspense: true });

  return (
    <Section title="Dados Pessoais">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Nome" icon={User} defaultValue={data.name} readOnly />
        <TextField
          label="Email"
          icon={Mail}
          defaultValue={data.email}
          readOnly
        />
      </div>
    </Section>
  );
}

function ClinicDataSection() {
  const { data, mutate } = useSWR<ClinicProfile>('/profile/me/clinic', {
    suspense: true,
  });
  const { trigger, isMutating } = useAsyncAction(mutate);

  const [name, setName] = useState(data.name ?? '');
  const [email, setEmail] = useState(data.email ?? '');
  const [phone, setPhone] = useState(data.phone ?? '');
  const [hours, setHours] = useState(data.hours ?? '');
  const [cnpj, setCnpj] = useState((data as { cnpj?: string }).cnpj ?? '');

  function validate() {
    if (!name.trim()) {
      toast.error('O nome da clínica é obrigatório.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Por favor, informe um e-mail válido.');
      return false;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      toast.error('Por favor, informe um telefone válido.');
      return false;
    }
    return true;
  }

  function cnpjMask(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  function handleSave() {
    if (!validate()) {
      return;
    }

    trigger(() =>
      api
        .put('/profile/me/clinic', {
          name,
          email,
          phone: phone.replace(/\D/g, ''),
          hours,
          cnpj: cnpj.replace(/\D/g, '') || undefined,
        })
        .then(() => {
          toast.success('Dados da clínica atualizados com sucesso!');
          mutate();
        }),
    );
  }

  return (
    <Section title="Dados da clínica">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Nome da Clínica"
          icon={Building}
          value={name}
          onChange={setName}
          placeholder="Ex: Clínica Sorriso"
        />
        <TextField
          label="Email de Contato"
          icon={Mail}
          value={email}
          onChange={setEmail}
          placeholder="contato@email.com"
          type="email"
        />
        <TextField
          label="Telefone"
          icon={Phone}
          value={phone}
          onChange={(v) => setPhone(phoneMask(v))}
          placeholder="(99) 99999-9999"
        />
        <TextField
          label="CNPJ"
          icon={FileText}
          value={cnpj}
          onChange={(v) => setCnpj(cnpjMask(v))}
          placeholder="00.000.000/0000-00"
        />
        <TextField
          label="Horário de Funcionamento"
          icon={Clock}
          value={hours}
          onChange={setHours}
          placeholder="Seg a Sex: 08h-18h"
          className="md:col-span-2"
        />
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} loading={isMutating}>
          Salvar Alterações
        </Button>
      </div>
    </Section>
  );
}

function LoadingSection({ title }: { title: string }) {
  return (
    <Section title={title}>
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    </Section>
  );
}

export function SettingsPage() {
  return (
    <Page title="Configurações">
      <div className="space-y-8">
        <Suspense fallback={<LoadingSection title="Dados Pessoais" />}>
          <PersonalDataSection />
        </Suspense>
        <Suspense fallback={<LoadingSection title="Dados da clínica" />}>
          <ClinicDataSection />
        </Suspense>
      </div>
    </Page>
  );
}
