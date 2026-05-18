import React, { useState, useEffect } from 'react';
import { Save, Building2, MapPin, Phone, Mail, Globe, Clock, Bell } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';

export function ConfiguracoesPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/configuracoes')
      .then(({ data }) => {
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setWebsite(data.website || '');
        setAddress(data.address || '');
        setHours(data.hours || '');
        setNotifyEmail(data.notifyEmail !== false);
        setNotifySms(data.notifySms === true);
        setAutoConfirm(data.autoConfirm !== false);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api.put('/configuracoes', { name, email, phone, website, address, hours, notifyEmail, notifySms, autoConfirm });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Configurações</h1>
        </div>
        <div className="space-y-6">
          {[1,2,3].map((i) => <div key={i} className="h-48 bg-[#F8FAFC] rounded-3xl animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Configurações</h1>
        <p className="text-[#64748B] mt-1 text-sm">Gerencie os dados e preferências da sua clínica.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Section title="Dados da clínica" description="Informações exibidas no perfil público.">
          <Field label="Nome da clínica" icon={<Building2 size={16} />}>
            <input value={name} onChange={(e) => setName(e.target.value)} className="form-input" />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="E-mail" icon={<Mail size={16} />}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
            </Field>
            <Field label="Telefone" icon={<Phone size={16} />}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" />
            </Field>
          </div>
          <Field label="Site" icon={<Globe size={16} />}>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="form-input" />
          </Field>
          <Field label="Endereço" icon={<MapPin size={16} />}>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="form-input" />
          </Field>
          <Field label="Horário de funcionamento" icon={<Clock size={16} />}>
            <input value={hours} onChange={(e) => setHours(e.target.value)} className="form-input" />
          </Field>
        </Section>

        <Section title="Notificações" description="Escolha como deseja receber avisos sobre agendamentos.">
          <ToggleRow
            icon={<Mail size={18} className="text-[#0077B6]" />}
            title="Notificações por e-mail"
            description="Receber confirmações e lembretes por e-mail."
            checked={notifyEmail}
            onChange={setNotifyEmail}
          />
          <ToggleRow
            icon={<Bell size={18} className="text-[#0077B6]" />}
            title="Notificações por SMS"
            description="Receber lembretes via mensagem de texto."
            checked={notifySms}
            onChange={setNotifySms}
          />
        </Section>

        <Section title="Preferências de agendamento" description="Defina o comportamento padrão da agenda.">
          <ToggleRow
            icon={<Clock size={18} className="text-[#0077B6]" />}
            title="Confirmar agendamentos automaticamente"
            description="Novos agendamentos serão marcados como confirmados sem revisão manual."
            checked={autoConfirm}
            onChange={setAutoConfirm}
          />
        </Section>

        <div className="sticky bottom-4 bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 shadow-md flex items-center justify-between">
          <p className="text-sm text-[#64748B]">
            {saveError
              ? <span className="font-semibold text-[#B91C1C]">{saveError}</span>
              : saved
              ? <span className="font-semibold text-[#065F46]">Alterações salvas com sucesso.</span>
              : 'As alterações entram em vigor imediatamente.'}
          </p>
          <Button type="submit" variant="primary" className="gap-2" disabled={saving}>
            <Save size={16} /> {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </form>

      <style>{`
        .form-input {
          width: 100%;
          height: 2.75rem;
          padding-left: 2.25rem;
          padding-right: 1rem;
          border-radius: 0.75rem;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #0F172A;
          outline: none;
          transition: border-color .15s, background-color .15s;
        }
        .form-input:focus { border-color: #00B4D8; background-color: #fff; }
      `}</style>
    </DashboardLayout>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-bold text-[#03045E]">{title}</h2>
        <p className="text-sm text-[#64748B] mt-0.5">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">{icon}</span>
        {children}
      </div>
    </label>
  );
}

function ToggleRow({ icon, title, description, checked, onChange }: {
  icon: React.ReactNode; title: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/60">
      <div className="w-10 h-10 rounded-xl bg-[#CAF0F8] flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#03045E]">{title}</p>
        <p className="text-sm text-[#64748B]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#023E8A]' : 'bg-[#CBD5E1]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}
