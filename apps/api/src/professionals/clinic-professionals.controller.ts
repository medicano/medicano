import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicProfessionalsService } from './clinic-professionals.service';

@Controller('clinics')
@UseGuards(JwtAuthGuard)
export class ClinicProfessionalsController {
  constructor(
    private readonly clinicProfessionalsService: ClinicProfessionalsService,
  ) {}

  @Post(':clinicId/professionals/:professionalId')
  async assign(
    @Param('clinicId') clinicId: string,
    @Param('professionalId') professionalId: string,
  ) {
    return this.clinicProfessionalsService.assignProfessionalToClinic(
      clinicId,
      professionalId,
    );
  }

  @Get(':clinicId/professionals')
  async getByClinic(@Param('clinicId') clinicId: string) {
    return this.clinicProfessionalsService.getProfessionalsByClinic(clinicId);
  }

  @Delete(':clinicId/professionals/:professionalId')
  async remove(
    @Param('clinicId') clinicId: string,
    @Param('professionalId') professionalId: string,
  ) {
    return this.clinicProfessionalsService.removeProfessionalFromClinic(
      clinicId,
      professionalId,
    );
  }
}
