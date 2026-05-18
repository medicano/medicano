import React, { useState } from 'react';
import { Plus, Pencil, Trash2, UserCog, X } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { useApi, extractList } from '../lib/hooks';
import { api } from '../lib/api';

export function AtendentesPage() {
  const atendApi = useApi<any[]>('/atendentes');
  const list = extractList(atendApi.data);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [removing, setRemoving] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate(data: { displayName: string; username: string; password: string }) {
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/atendentes', data);
      atendApi.refetch();
      setCreating(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || 'Erro ao cadastrar atendente');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(data: { displayName: string; active: boolean; password: string }) {
    if (!editing) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.put(`/atendentes/${editing.id}`, data);
      atendApi.refetch();
      setEditing(null);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || 'Erro ao atualizar atendente');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!removing) return;
    try {
      await api.delete(`/atendentes/${removing.id}`);
      atendApi.refetch();
    } catch (e) { console.error(e); }
    setRemoving(null);
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Atendentes</h1>
          <p className="text-[#64748B] mt-1 text-sm">
            <span className="font-bold">{list.length}</span> atendentes cadastrados
          </p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => { setFormError(null); setCreating(true); }}>
          <Plus size={18} /> Novo atendente
        </Button>
      </div>

      {atendApi.loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-[#F8FAFC] rounded-2xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-6">
            <UserCog size={36} className="text-[#0077B6]" />
          </div>
          <h2 className="text-2xl font-bold text-[#03045E]">Nenhum atendente cadastrado</h2>
          <p className="text-[#64748B] mt-2 mb-6 max-w-md mx-auto">
            Cadastre atendentes para que possam gerenciar a agenda da sua clínica.
          </p>
          <Button variant="primary" className="gap-2" onClick={() => { setFormError(null); setCreating(true); }}>
            <Plus size={18} /> Novo atendente
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.5fr_1.2fr_120px_120px] gap-4 px-6 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <div>Nome de exibição</div>
            <div>Usuário</div>
            <div>Status</div>
            <div className="text-right">Ações</div>
          </div>
          {list.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-[1fr_auto] md:grid-cols-[1.5fr_1.2fr_120px_120px] gap-4 items-center px-6 py-4 border-b border-[#E2E8F0] last:border-b-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#48CAE4] to-[#0077B6] flex items-center justify-center text-white font-bold shrink-0">
                  {(a.displayName || '??').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{a.displayName}</p>
                  <p className="text-xs text-[#64748B] md:hidden truncate">@{a.username}</p>
                </div>
              </div>
              <div className="hidden md:block text-sm text-[#0F172A] font-mono truncate">@{a.username}</div>
              <div className="hidden md:block">
                <ActiveBadge active={a.active !== false} />
              </div>
              <div className="flex items-center gap-1 justify-end">
                <button
                  onClick={() => { setFormError(null); setEditing(a); }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] hover:text-[#023E8A] px-3 py-2 rounded-lg hover:bg-[#E0F2FE] transition-colors"
                >
                  <Pencil size={14} /> <span className="hidden md:inline">Editar</span>
                </button>
                <button
                  onClick={() => setRemoving(a)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B91C1C] hover:text-[#7F1D1D] px-3 py-2 rounded-lg hover:bg-[#FEE2E2] transition-colors"
                >
                  <Trash2 size={14} /> <span className="hidden md:inline">Remover</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <AttendantFormModal
          title="Novo atendente"
          submitLabel="Cadastrar"
          mode="create"
          error={formError}
          submitting={submitting}
          onClose={() => setCreating(false)}
          onSubmit={handleCreate as any}
        />
      )}

      {editing && (
        <AttendantFormModal
          title="Editar atendente"
          submitLabel="Salvar alterações"
          mode="edit"
          error={formError}
          submitting={submitting}
          initialValues={{ displayName: editing.displayName, active: editing.active !== false }}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate as any}
        />
      )}

      <ConfirmModal
        open={!!removing}
        title="Remover atendente?"
        description={`O atendente ${removing?.displayName} (@${removing?.username}) perderá o acesso. Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, remover"
        variant="danger"
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
      />
    </DashboardLayout>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full font-bold bg-[#A7F3D0] text-[#065F46] text-xs px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Ativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full font-bold bg-[#F1F5F9] text-[#64748B] text-xs px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" /> Inativo
    </span>
  );
}

interface FormModalBaseProps {
  title: string;
  submitLabel: string;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
}
interface FormModalCreateProps extends FormModalBaseProps {
  mode: 'create';
  onSubmit: (data: { displayName: string; username: string; password: string }) => void;
  initialValues?: never;
}
interface FormModalEditProps extends FormModalBaseProps {
  mode: 'edit';
  initialValues: { displayName: string; active: boolean };
  onSubmit: (data: { displayName: string; active: boolean; password: string }) => void;
}
type FormModalProps = FormModalCreateProps | FormModalEditProps;

function AttendantFormModal(props: FormModalProps) {
  const init = props.mode === 'edit' ? props.initialValues : { displayName: '', active: true };
  const [displayName, setDisplayName] = useState(init.displayName);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(init.active);

  const inputCls = 'w-full h-11 px-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:bg-white transition-colors';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (props.mode === 'create') {
      if (!displayName || !username || !password) return;
      props.onSubmit({ displayName, username, password });
    } else {
      if (!displayName) return;
      props.onSubmit({ displayName, active, password });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03045E]/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E8F0]">
        <div className="flex items-start justify-between p-6 pb-4">
          <h3 className="text-lg font-bold text-[#03045E]">{props.title}</h3>
          <button onClick={props.onClose} className="text-[#64748B] hover:text-[#0F172A]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {props.error && (
            <p className="text-sm text-[#B91C1C] bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg px-3 py-2">{props.error}</p>
          )}
          <label className="block">
            <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Nome de exibição *</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex.: Maria Souza" required className={inputCls} />
          </label>

          {props.mode === 'create' && (
            <label className="block">
              <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Nome de usuário *</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex.: maria.souza" required className={inputCls} />
            </label>
          )}

          <label className="block">
            <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
              Senha {props.mode === 'create' ? '*' : <span className="text-[#94A3B8] font-normal normal-case">(deixe em branco para manter)</span>}
            </span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              required={props.mode === 'create'} className={inputCls} />
          </label>

          {props.mode === 'edit' && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60">
              <div>
                <p className="font-semibold text-[#03045E] text-sm">Atendente ativo</p>
                <p className="text-xs text-[#64748B] mt-0.5">Inativos não podem acessar o sistema.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive(!active)}
                className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-[#023E8A]' : 'bg-[#CBD5E1]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={props.onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={props.submitting}>
              {props.submitting ? 'Salvando…' : props.submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
