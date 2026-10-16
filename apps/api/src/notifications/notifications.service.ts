import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createTransport, Transporter } from 'nodemailer';

import { AppointmentDocument } from '../appointments/schemas/appointment.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { ProfessionalsService } from '../professionals/professionals.service';

import { appointmentCreatedTemplate } from './templates/appointment-created.template';
import { appointmentConfirmedTemplate } from './templates/appointment-confirmed.template';
import { appointmentCancelledTemplate } from './templates/appointment-cancelled.template';

type CancelledBy = 'patient' | 'provider';

interface ResolvedParties {
  patientEmail: string | null;
  patientName: string;
  professionalEmail: string | null;
  professionalName: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: Transporter | null;
  private readonly fromEmail: string;

  // SMTP genérico: serve para qualquer provedor (Brevo, Resend, Zoho, Mailgun,
  // Postmark, o próprio SES pela interface SMTP...). Sem SMTP_HOST, os e-mails
  // são só registrados no log, para dev e homologação não mandarem nada real.
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly professionalsService: ProfessionalsService,
  ) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') ?? 'Medicano <no-reply@medicano.app>';

    const host = this.configService.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST is not configured — notification emails will only be logged');
      this.transporter = null;
      return;
    }

    const port = parseInt(this.configService.get<string>('SMTP_PORT') ?? '587', 10);
    const user = this.configService.get<string>('SMTP_USER');

    this.transporter = createTransport({
      host,
      port,
      // 465 = TLS implícito; 587 = STARTTLS (exigido abaixo).
      secure: port === 465,
      requireTLS: port !== 465,
      ...(user ? { auth: { user, pass: this.configService.get<string>('SMTP_PASS') ?? '' } } : {}),
    });
  }

  async notifyAppointmentCreated(appointment: AppointmentDocument): Promise<void> {
    try {
      const parties = await this.resolveParties(appointment);

      if (parties.patientEmail) {
        const { subject, html, text } = appointmentCreatedTemplate({
          recipientType: 'patient',
          patientName: parties.patientName,
          professionalName: parties.professionalName,
          startAt: appointment.startAt,
          durationMinutes: appointment.durationMinutes,
        });
        await this.sendEmail(parties.patientEmail, subject, html, text);
      } else {
        this.logger.warn(
          `notifyAppointmentCreated: skipping patient email — no email resolved for appointment ${appointment._id}`,
        );
      }

      if (parties.professionalEmail) {
        const { subject, html, text } = appointmentCreatedTemplate({
          recipientType: 'professional',
          patientName: parties.patientName,
          professionalName: parties.professionalName,
          startAt: appointment.startAt,
          durationMinutes: appointment.durationMinutes,
        });
        await this.sendEmail(parties.professionalEmail, subject, html, text);
      } else {
        this.logger.warn(
          `notifyAppointmentCreated: skipping professional email — no email resolved for appointment ${appointment._id}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `notifyAppointmentCreated: unexpected error for appointment ${appointment._id} — ${(err as Error).message}`,
      );
    }
  }

  async notifyAppointmentConfirmed(appointment: AppointmentDocument): Promise<void> {
    try {
      const parties = await this.resolveParties(appointment);

      if (!parties.patientEmail) {
        this.logger.warn(
          `notifyAppointmentConfirmed: skipping patient email — no email resolved for appointment ${appointment._id}`,
        );
        return;
      }

      const { subject, html, text } = appointmentConfirmedTemplate({
        patientName: parties.patientName,
        professionalName: parties.professionalName,
        startAt: appointment.startAt,
      });

      await this.sendEmail(parties.patientEmail, subject, html, text);
    } catch (err) {
      this.logger.warn(
        `notifyAppointmentConfirmed: unexpected error for appointment ${appointment._id} — ${(err as Error).message}`,
      );
    }
  }

  async notifyAppointmentCancelled(
    appointment: AppointmentDocument,
    cancelledBy: CancelledBy = 'provider',
  ): Promise<void> {
    try {
      const parties = await this.resolveParties(appointment);

      if (cancelledBy === 'patient') {
        if (!parties.professionalEmail) {
          this.logger.warn(
            `notifyAppointmentCancelled: skipping professional email — no email resolved for appointment ${appointment._id}`,
          );
          return;
        }

        const { subject, html, text } = appointmentCancelledTemplate({
          recipientName: parties.professionalName,
          otherPartyName: parties.patientName,
          cancelledBy,
          startAt: appointment.startAt,
        });

        await this.sendEmail(parties.professionalEmail, subject, html, text);
      } else {
        if (!parties.patientEmail) {
          this.logger.warn(
            `notifyAppointmentCancelled: skipping patient email — no email resolved for appointment ${appointment._id}`,
          );
          return;
        }

        const { subject, html, text } = appointmentCancelledTemplate({
          recipientName: parties.patientName,
          otherPartyName: parties.professionalName,
          cancelledBy,
          startAt: appointment.startAt,
        });

        await this.sendEmail(parties.patientEmail, subject, html, text);
      }
    } catch (err) {
      this.logger.warn(
        `notifyAppointmentCancelled: unexpected error for appointment ${appointment._id} — ${(err as Error).message}`,
      );
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`sendEmail (dry-run): "${subject}" → ${to}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html: htmlBody,
        text: textBody,
      });
    } catch (err) {
      this.logger.warn(`sendEmail: failed to send email via SMTP — ${(err as Error).message}`);
    }
  }

  private async resolveParties(appointment: AppointmentDocument): Promise<ResolvedParties> {
    let patientEmail: string | null = null;
    let patientName = 'Patient';
    let professionalEmail: string | null = null;
    let professionalName = 'Professional';

    // Resolve patient — patientId is the User._id directly
    try {
      const patientUser = (await this.userModel
        .findById(appointment.patientId)
        .exec()) as UserDocument | null;

      if (patientUser) {
        patientEmail = (patientUser as any).email ?? null;
        patientName = (patientUser as any).name ?? patientName;
      } else {
        this.logger.warn(`resolveParties: patient not found for appointment ${appointment._id}`);
      }
    } catch (err) {
      this.logger.warn(
        `resolveParties: error resolving patient for appointment ${appointment._id} — ${(err as Error).message}`,
      );
    }

    // Resolve professional
    try {
      const professional = await this.professionalsService.findById(String(appointment.professionalId));

      if (professional) {
        professionalName = (professional as any).name ?? professionalName;

        const professionalUser = (await this.userModel
          .findById((professional as any).userId)
          .exec()) as UserDocument | null;

        if (professionalUser) {
          professionalEmail = (professionalUser as any).email ?? null;
        } else {
          this.logger.warn(
            `resolveParties: user not found for professional in appointment ${appointment._id}`,
          );
        }
      } else {
        this.logger.warn(
          `resolveParties: professional not found for appointment ${appointment._id}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `resolveParties: error resolving professional for appointment ${appointment._id} — ${(err as Error).message}`,
      );
    }

    return { patientEmail, patientName, professionalEmail, professionalName };
  }
}
