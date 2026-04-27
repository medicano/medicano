import { formatDateBR } from '../utils/format-date';

export interface AppointmentCancelledData {
  recipientName: string;
  otherPartyName: string;
  startAt: Date;
  cancelledBy: 'patient' | 'provider';
}

export function appointmentCancelledTemplate(
  data: AppointmentCancelledData,
): { subject: string; html: string; text: string } {
  const { recipientName, otherPartyName, startAt, cancelledBy } = data;
  const formattedDate = formatDateBR(startAt);
  const subject = 'Agendamento cancelado';

  const cancellationReason =
    cancelledBy === 'patient' ? 'foi cancelado pelo paciente.' : 'foi cancelado pelo prestador.';

  const html = [
    `<p>Olá <strong>${recipientName}</strong>,</p>`,
    `<p>O agendamento com <strong>${otherPartyName}</strong> para <strong>${formattedDate}</strong> ${cancellationReason}</p>`,
    `<p>Atenciosamente, Equipe Medicano</p>`,
  ].join('\n');

  const text = [
    `Olá ${recipientName},`,
    `O agendamento com ${otherPartyName} para ${formattedDate} ${cancellationReason}`,
    `Atenciosamente, Equipe Medicano`,
  ].join('\n');

  return { subject, html, text };
}
