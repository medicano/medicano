import { formatDateBR } from '../utils/format-date';

export interface AppointmentConfirmedData {
  patientName: string;
  professionalName: string;
  startAt: Date;
}

export function appointmentConfirmedTemplate(
  data: AppointmentConfirmedData,
): { subject: string; html: string; text: string } {
  const { patientName, professionalName, startAt } = data;
  const formattedDate = formatDateBR(startAt);
  const subject = 'Agendamento confirmado';

  const html = [
    `<p>Olá <strong>${patientName}</strong>,</p>`,
    `<p>Seu agendamento com <strong>${professionalName}</strong> para <strong>${formattedDate}</strong> foi confirmado.</p>`,
    `<p>Atenciosamente, Equipe Medicano</p>`,
  ].join('\n');

  const text = [
    `Olá ${patientName},`,
    `Seu agendamento com ${professionalName} para ${formattedDate} foi confirmado.`,
    `Atenciosamente, Equipe Medicano`,
  ].join('\n');

  return { subject, html, text };
}
