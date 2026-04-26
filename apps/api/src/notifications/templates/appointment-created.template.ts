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
  const subject = 'Novo agendamento na Medicano';
  const formattedDate = formatDateBR(data.startAt);

  let text: string;
  let html: string;

  if (data.recipientType === 'patient') {
    text =
      `Olá ${data.patientName}, seu agendamento com ${data.professionalName} foi registrado para ${formattedDate}.\n\n` +
      `Atenciosamente, Equipe Medicano`;

    html =
      `<p>Olá <strong>${data.patientName}</strong>, seu agendamento com <strong>${data.professionalName}</strong> foi registrado para <strong>${formattedDate}</strong>.</p>` +
      `<p>Atenciosamente,<br />Equipe Medicano</p>`;
  } else {
    text =
      `Olá ${data.professionalName}, um novo agendamento foi registrado com o paciente ${data.patientName} para ${formattedDate}.\n\n` +
      `Atenciosamente, Equipe Medicano`;

    html =
      `<p>Olá <strong>${data.professionalName}</strong>, um novo agendamento foi registrado com o paciente <strong>${data.patientName}</strong> para <strong>${formattedDate}</strong>.</p>` +
      `<p>Atenciosamente,<br />Equipe Medicano</p>`;
  }

  return { subject, html, text };
}
