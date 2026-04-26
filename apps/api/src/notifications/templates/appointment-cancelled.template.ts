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
  const subject = 'Agendamento cancelado';
  const formattedDate = formatDateBR(data.startAt);
  const cancelledByLabel =
    data.cancelledBy === 'patient' ? 'pelo paciente' : 'pelo prestador';

  const text =
    `Olá ${data.recipientName}, o agendamento com ${data.otherPartyName} para ${formattedDate} foi cancelado ${cancelledByLabel}.\n\n` +
    `Atenciosamente, Equipe Medicano`;

  const html =
    `<p>Olá <strong>${data.recipientName}</strong>, o agendamento com <strong>${data.otherPartyName}</strong> para <strong>${formattedDate}</strong> foi cancelado ${cancelledByLabel}.</p>` +
    `<p>Atenciosamente,<br />Equipe Medicano</p>`;

  return { subject, html, text };
}
