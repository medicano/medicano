import { formatDateBR } from '../utils/format-date';

export interface AppointmentConfirmedData {
  patientName: string;
  professionalName: string;
  startAt: Date;
}

export function appointmentConfirmedTemplate(
  data: AppointmentConfirmedData,
): { subject: string; html: string; text: string } {
  const subject = 'Seu agendamento foi confirmado';
  const formattedDate = formatDateBR(data.startAt);

  const text =
    `Olá ${data.patientName}, seu agendamento com ${data.professionalName} para ${formattedDate} foi confirmado.\n\n` +
    `Atenciosamente, Equipe Medicano`;

  const html =
    `<p>Olá <strong>${data.patientName}</strong>, seu agendamento com <strong>${data.professionalName}</strong> para <strong>${formattedDate}</strong> foi confirmado.</p>` +
    `<p>Atenciosamente,<br />Equipe Medicano</p>`;

  return { subject, html, text };
}
