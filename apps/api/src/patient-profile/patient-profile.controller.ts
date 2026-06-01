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

interface AuthenticatedUser {
  userId: string;
  role: Role;
}

@Controller('patient-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientProfileController {
  constructor(private readonly patientProfileService: PatientProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.patientProfileService.findByUserId(user.userId);
  }

  @Patch()
  async upsertProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientProfileService.upsertForUser(user.userId, dto);
  }

  @Get('export')
  async exportProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.patientProfileService.exportForUser(user.userId);
  }

  @Delete()
  async deleteProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.patientProfileService.hardDeleteForUser(user.userId);
  }

  @Patch('use-in-triage')
  async setUseInTriage(
    @CurrentUser() user: AuthenticatedUser,
    @Body('useInTriage') value: boolean,
  ) {
    return this.patientProfileService.setUseInTriage(user.userId, value);
  }
}
