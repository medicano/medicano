import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AvailabilityService } from '../availability.service';
import { AppointmentsService } from '../../appointments/appointments.service';
import { ProfessionalsService } from '../../professionals/professionals.service';
import { ClinicProfessionalDocument } from '../../professionals/schemas/clinic-professional.schema';
import { UserDocument } from '../../auth/schemas/user.schema';
import { Role } from '../../common/enums/role.enum';
import { GetScheduleQueryDto } from '../dto/get-schedule-query.dto';
import type { IScheduleResponse as ScheduleResponse } from '@medicano/types';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly appointmentsService: AppointmentsService,
    private readonly professionalsService: ProfessionalsService,
    @InjectModel('ClinicProfessional')
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    @InjectModel('User')
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getProviderSchedule(
    professionalId: string,
    query: GetScheduleQueryDto,
    currentUserId: string,
  ): Promise<ScheduleResponse> {
    if (!Types.ObjectId.isValid(professionalId)) {
      throw new BadRequestException('Invalid professionalId');
    }

    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const professional = await this.professionalsService.findById(professionalId);
    if (!professional) {
      throw new NotFoundException('Professional not found');
    }

    await this.authorize(currentUser, professional, professionalId);

    const availableSlots = await this.availabilityService.getAvailableSlots(
      professionalId,
      {
        fromDate: query.fromDate,
        toDate: query.toDate,
      } as any,
    );

    const fromDateObj = new Date(query.fromDate);
    const toDateObj = new Date(query.toDate);
    toDateObj.setHours(23, 59, 59, 999);

    const appointments = await this.appointmentsService.findAll({
      professionalId,
      dateFrom: fromDateObj.toISOString(),
      dateTo: toDateObj.toISOString(),
    } as any);

    return {
      fromDate: query.fromDate,
      toDate: query.toDate,
      availableSlots,
      appointments: appointments as any[],
    };
  }

  private async authorize(
    currentUser: UserDocument,
    professional: any,
    professionalId: string,
  ): Promise<void> {
    const role = (currentUser as any).role;

    if (role === Role.PROFESSIONAL) {
      const professionalUserId =
        professional.userId ?? professional.user ?? professional._id;
      if (String(professionalUserId) !== String((currentUser as any)._id)) {
        throw new ForbiddenException();
      }
      return;
    }

    if (role === Role.CLINIC) {
      const clinicId =
        (currentUser as any).clinicId ?? (currentUser as any)._id;
      if (!clinicId) {
        throw new ForbiddenException();
      }
      const exists = await this.clinicProfessionalModel.exists({
        clinicId,
        professionalId,
      });
      if (!exists) {
        throw new ForbiddenException();
      }
      return;
    }

    if (role === Role.ATTENDANT) {
      const clinicId = (currentUser as any).clinicId;
      if (!clinicId) {
        throw new ForbiddenException();
      }
      const exists = await this.clinicProfessionalModel.exists({
        clinicId,
        professionalId,
      });
      if (!exists) {
        throw new ForbiddenException();
      }
      return;
    }

    throw new ForbiddenException();
  }
}
