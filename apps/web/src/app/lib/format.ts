import { type AppointmentStatus } from '../components/StatusBadge';

export function mapStatus(s: string | undefined | null): AppointmentStatus {
  const v = String(s ?? '').toLowerCase();
  if (v === 'confirmed') return 'CONFIRMED';
  if (v === 'completed' || v === 'done') return 'COMPLETED';
  if (v === 'cancelled' || v === 'canceled') return 'CANCELLED';
  return 'SCHEDULED';
}

export function formatDateShort(iso: string | Date | undefined | null): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
}

export function formatDateLong(iso: string | Date | undefined | null): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatSlot(iso: string | Date | undefined | null): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(iso: string | Date | undefined | null): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  const months = Math.round(days / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

export function initials(name: string | undefined | null): string {
  if (!name) return '?';
  return name.replace(/^(Dr\.|Dra\.)\s*/i, '')
    .split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
