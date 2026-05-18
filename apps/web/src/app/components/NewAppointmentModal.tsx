import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Stethoscope, FileText } from 'lucide-react';
import { Button } from './ui/Button';
import { api } from '../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewAppointmentModal({ open, onClose }: Props) {
  const [patientName, setPatientName] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.get('/professionals')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.items ?? data?.professionals ?? []);
        setProfessionals(list);
        if (list.length > 0 && !professionalId) setProfessionalId(list[0].id);
      })
      .catch((e) => console.error(e));
  }, [open]);

  function reset() {
    setPatientName('');
    setProfessionalId('');
    setStartAt('');
    setDuration(60);
    setNotes('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim() || !startAt) {
      setError('Preencha o nome do paciente e a data/hora.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/appointments', {
        patientName: patientName.trim(),
        professionalId: professionalId || undefined,
        startAt,
        durationMinutes: duration,
        notes: notes.trim() || undefined,
      });
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erro ao criar agendamento');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03045E]/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-6 border-b border-[#E2E8F0] sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-[#03045E]">Novo agendamento</h3>
            <p className="text-sm text-[#64748B] mt-0.5">Preencha os dados do atendimento.</p>
          </div>
          <button onClick={handleClose} className="text-[#64748B] hover:text-[#0F172A]">
            <X size={20} />
          </button>
        </div>

        <form className="p-6 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <p className="text-sm text-[#B91C1C] bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg px-3 py-2">{error}</p>
          )}

          <Field label="Paciente" icon={User}>
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Nome do paciente"
              required
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8]"
            />
          </Field>

          <Field label="Profissional" icon={Stethoscope}>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8]"
            >
              {professionals.length === 0
                ? <option value="">Nenhum profissional cadastrado</option>
                : professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.specialty ? ` — ${p.specialty}` : ''}
                    </option>
                  ))}
            </select>
          </Field>

          <Field label="Data e hora de início" icon={Calendar}>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8]"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-[#0F172A]">Duração</label>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0077B6]">
                <Clock size={14} /> {duration} min
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={480}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-[#10B981]"
            />
            <div className="flex justify-between text-xs text-[#94A3B8] mt-1">
              <span>15 min</span>
              <span>480 min</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-[#64748B]" /> Notas <span className="font-normal text-[#94A3B8]">(opcional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o atendimento..."
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] focus:ring-4 focus:ring-[#CAF0F8] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={handleClose}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Criando…' : 'Criar agendamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, icon: Icon, children,
}: {
  label: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0F172A] mb-2">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#64748B] pointer-events-none">
          <Icon size={18} />
        </div>
        {children}
      </div>
    </div>
  );
}
