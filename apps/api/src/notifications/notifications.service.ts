import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import { AppointmentDocument } from '../appointments/schemas/appointment.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
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

interface SesConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  fromEmail: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly sesClient: SESClient;
  private readonly fromEmail: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly professionalsService: ProfessionalsService,
  ) {
    const sesConfig = this.configService.get<SesConfig>('ses');

    if (!sesConfig?.fromEmail) {
      this.logger.warn('SES fromEmail is not configured — notification emails will not be sent');
    }

    this.fromEmail = sesConfig?.fromEmail ?? '';

    this.sesClient = new SESClient({
      region: sesConfig?.region ?? 'us-east-1',
      ...(sesConfig?.accessKeyId
        ? {
            credentials: {
              accessKeyId: sesConfig.accessKeyId,
              secretAccessKey: sesConfig.secretAccessKey ?? '',
            },
          }
        : {}),
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
    if (!this.fromEmail) {
      this.logger.warn('sendEmail: fromEmail is not configured — skipping send');
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      });

      await this.sesClient.send(command);
    } catch (err) {
      this.logger.warn(`sendEmail: failed to send email via SES — ${(err as Error).message}`);
    }
  }

  private async resolveParties(appointment: AppointmentDocument): Promise<ResolvedParties> {
    let patientEmail: string | null = null;
    let patientName = 'Patient';
    let professionalEmail: string | null = null;
    let professionalName = 'Professional';

    // Resolve patient
    try {
      const patient = (await this.patientModel
        .findById(appointment.patientId)
        .exec()) as PatientDocument | null;

      if (patient) {
        patientName = (patient as any).name ?? patientName;

        const patientUser = (await this.userModel
          .findById((patient as any).userId)
          .exec()) as UserDocument | null;

        if (patientUser) {
          patientEmail = (patientUser as any).email ?? null;
          patientName = (patientUser as any).displayName ?? (patientUser as any).name ?? patientName;
        } else {
          this.logger.warn(
            `resolveParties: user not found for patient in appointment ${appointment._id}`,
          );
        }
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
        professionalName = (professional as any).displayName ?? professionalName;

        const professionalUser = (await this.userModel
          .findById((professional as any).userId)
          .exec()) as UserDocument | null;

        if (professionalUser) {
          professionalEmail = (professionalUser as any).email ?? null;
          professionalName =
            (professionalUser as any).displayName ?? (professionalUser as any).name ?? professionalName;
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
