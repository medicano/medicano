import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { AppointmentsService } from '../../appointments/appointments.service';
import { AvailabilityService } from '../availability.service';
import { ProfessionalsService } from '../../professionals/professionals.service';
import { GetScheduleQueryDto } from '../dto/get-schedule-query.dto';
import { Role } from '../../common/enums/role.enum';

export interface IScheduleResponse {
  fromDate: string;
  toDate: string;
  availableSlots: any[];
  appointments: any[];
}

@Injectable()
export class ScheduleService {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly appointmentsService: AppointmentsService,
    private readonly professionalsService: ProfessionalsService,
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('ClinicProfessional')
    private readonly clinicProfessionalModel: Model<any>,
  ) {}

  async getProviderSchedule(
    professionalId: string,
    query: GetScheduleQueryDto,
    currentUserId: string,
  ): Promise<IScheduleResponse> {
    if (!isValidObjectId(professionalId)) {
      throw new BadRequestException('Invalid professionalId');
    }

    const fromDateObj = new Date(query.fromDate);
    const toDateObj = new Date(query.toDate);
    toDateObj.setHours(23, 59, 59, 999);

    if (toDateObj < fromDateObj) {
      throw new BadRequestException('toDate must be greater than or equal to fromDate');
    }

    const currentUser = await this.userModel.findById(currentUserId).exec();
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const professional = await this.professionalsService.findById(professionalId);
    if (!professional) {
      throw new NotFoundException('Professional not found');
    }

    const role: string = currentUser.role;

    if (role === Role.PROFESSIONAL) {
      const professionalUserId =
        professional.userId?.toString?.() ?? professional.userId;
      if (professionalUserId !== currentUserId) {
        throw new ForbiddenException(
          'You are not authorized to view this professional schedule',
        );
      }
    } else if (role === Role.CLINIC || role === Role.ATTENDANT) {
      const clinicId = currentUser.clinicId ?? currentUser._id;
      const link = await this.clinicProfessionalModel
        .findOne({
          clinicId: clinicId,
          professionalId: professionalId,
        })
        .exec();

      if (!link) {
        throw new ForbiddenException(
          'You are not authorized to view this professional schedule',
        );
      }
    } else {
      throw new ForbiddenException(
        'You are not authorized to view this professional schedule',
      );
    }

    const availableSlots = await this.availabilityService.getAvailableSlots(
      professionalId,
      { fromDate: fromDateObj, toDate: toDateObj },
    );

    const appointments = await this.appointmentsService.findAll({
      professionalId,
      dateFrom: fromDateObj.toISOString(),
      dateTo: toDateObj.toISOString(),
    });

    return {
      fromDate: query.fromDate,
      toDate: query.toDate,
      availableSlots,
      appointments,
    };
  }
}
