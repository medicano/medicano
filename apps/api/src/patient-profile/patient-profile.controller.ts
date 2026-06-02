import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
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

  @Patch()
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
  async deleteProfile(@CurrentUser() userId: string) {
    return this.patientProfileService.hardDeleteForUser(userId);
  }

  @Patch('use-in-assistant')
  async setUseInAssistant(
    @CurrentUser() userId: string,
    @Body('useInAssistant') value: boolean,
  ) {
    return this.patientProfileService.setUseInAssistant(userId, value);
  }
}
