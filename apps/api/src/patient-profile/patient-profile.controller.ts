import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PatientProfileService } from './patient-profile.service';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Controller('patient-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientProfileController {
  constructor(private readonly patientProfileService: PatientProfileService) {}

  @Get()
  async getProfile(@CurrentUser() userId: string) {
    return this.patientProfileService.findByUserId(userId);
  }

  @Put()
  async upsertProfile(
    @CurrentUser() userId: string,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientProfileService.upsertForUser(userId, dto);
  }

  @Get('export')
  async exportProfile(@CurrentUser() userId: string) {
    return this.patientProfileService.exportForUser(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@CurrentUser() userId: string): Promise<void> {
    await this.patientProfileService.hardDeleteForUser(userId);
  }

  @Patch('triage-consent')
  async setTriageConsent(
    @CurrentUser() userId: string,
    @Body('useInTriage') useInTriage: boolean,
  ) {
    return this.patientProfileService.setUseInTriage(userId, useInTriage);
  }
}
