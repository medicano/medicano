import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';

import { ActivityLogService } from './activity-log.service';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityLogController {
  constructor(
    private readonly activityLogService: ActivityLogService,
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(Professional.name) private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  @Get('clinics/:clinicId/activity-log')
  @Roles(Role.CLINIC)
  async listForClinic(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
    @CurrentUser() currentUserId: string,
    @Query() query: ActivityLogQueryDto,
  ) {
    const clinic = await this.clinicModel.findById(clinicId).select('userId').lean().exec();
    if (!clinic) {
      throw new NotFoundException('Estabelecimento de saúde não encontrado');
    }
    if (String(clinic.userId) !== currentUserId) {
      throw new ForbiddenException('Você não é o responsável por este estabelecimento');
    }
    return this.activityLogService.listByClinic(clinicId, query.limit);
  }

  @Get('professionals/:professionalId/activity-log')
  @Roles(Role.PROFESSIONAL)
  async listForProfessional(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @CurrentUser() currentUserId: string,
    @Query() query: ActivityLogQueryDto,
  ) {
    const professional = await this.professionalModel
      .findById(professionalId)
      .select('userId')
      .lean()
      .exec();
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }
    if (String(professional.userId) !== currentUserId) {
      throw new ForbiddenException('Você não é o responsável por este perfil');
    }
    return this.activityLogService.listByProfessional(professionalId, query.limit);
  }
}
