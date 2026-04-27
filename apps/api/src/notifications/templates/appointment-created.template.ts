import { formatDateBR } from '../utils/format-date';

export interface AppointmentCreatedData {
  patientName: string;
  professionalName: string;
  startAt: Date;
  durationMinutes: number;
  recipientType: 'patient' | 'professional';
}

export function appointmentCreatedTemplate(
  data: AppointmentCreatedData,
): { subject: string; html: string; text: string } {
  const { patientName, professionalName, startAt, durationMinutes, recipientType } = data;
  const formattedDate = formatDateBR(startAt);
  const subject = 'Novo agendamento criado';

  if (recipientType === 'patient') {
    const html = [
      `<p>Olá <strong>${patientName}</strong>,</p>`,
      `<p>Seu agendamento com <strong>${professionalName}</strong> para <strong>${formattedDate}</strong> foi criado com sucesso.</p>`,
      `<p>Duração: ${durationMinutes} minutos.</p>`,
      `<p>Atenciosamente, Equipe Medicano</p>`,
    ].join('\n');

    const text = [
      `Olá ${patientName},`,
      `Seu agendamento com ${professionalName} para ${formattedDate} foi criado com sucesso.`,
      `Duração: ${durationMinutes} minutos.`,
      `Atenciosamente, Equipe Medicano`,
    ].join('\n');

    return { subject, html, text };
  }

  const html = [
    `<p>Olá <strong>${professionalName}</strong>,</p>`,
    `<p>Um novo agendamento com <strong>${patientName}</strong> para <strong>${formattedDate}</strong> foi criado.</p>`,
    `<p>Duração: ${durationMinutes} minutos.</p>`,
    `<p>Atenciosamente, Equipe Medicano</p>`,
  ].join('\n');

  const text = [
    `Olá ${professionalName},`,
    `Um novo agendamento com ${patientName} para ${formattedDate} foi criado.`,
    `Duração: ${durationMinutes} minutos.`,
    `Atenciosamente, Equipe Medicano`,
  ].join('\n');

  return { subject, html, text };
}
