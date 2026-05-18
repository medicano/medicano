export type NotificationType = 'CONFIRMED' | 'CANCELLED' | 'REMINDER';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

function minutesAgo(m: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - m);
  return d;
}

export const initialNotifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'CONFIRMED',
    title: 'Agendamento confirmado',
    message: 'Sua consulta com Dra. Renata Souza foi confirmada para quinta-feira às 14:30.',
    createdAt: minutesAgo(45),
    read: false,
  },
  {
    id: 'n2',
    type: 'REMINDER',
    title: 'Lembrete de consulta',
    message: 'Você tem uma consulta amanhã às 09:00 com Dr. Marcelo Almeida.',
    createdAt: minutesAgo(60 * 2),
    read: false,
  },
  {
    id: 'n3',
    type: 'CANCELLED',
    title: 'Agendamento cancelado',
    message: 'A consulta de 04/04 com Dr. Ricardo foi cancelada pela clínica.',
    createdAt: minutesAgo(60 * 26),
    read: true,
  },
  {
    id: 'n4',
    type: 'REMINDER',
    title: 'Complete sua triagem',
    message: 'Você iniciou uma triagem e ainda não finalizou. Continue de onde parou.',
    createdAt: minutesAgo(60 * 50),
    read: true,
  },
];

export function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
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
