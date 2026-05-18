import React from 'react';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

const map: Record<AppointmentStatus, { label: string; bg: string; text: string; dot: string }> = {
  SCHEDULED: { label: 'Agendado', bg: 'bg-[#E0F2FE]', text: 'text-[#0077B6]', dot: 'bg-[#0077B6]' },
  CONFIRMED: { label: 'Confirmado', bg: 'bg-[#A7F3D0]', text: 'text-[#065F46]', dot: 'bg-[#10B981]' },
  COMPLETED: { label: 'Concluído', bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', dot: 'bg-[#64748B]' },
  CANCELLED: { label: 'Cancelado', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]', dot: 'bg-[#EF4444]' }
};

export function StatusBadge({ status, size = 'sm' }: { status: AppointmentStatus; size?: 'sm' | 'lg' }) {
  const s = map[status];
  const sizing = size === 'lg' ? 'text-sm px-3 py-1.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${s.bg} ${s.text} ${sizing}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export const statusLabel = (s: AppointmentStatus) => map[s].label;
