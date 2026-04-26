import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { ProfileService } from './profile.service';
import { UpdatePatientProfileDto } from '../patients/dto/update-patient-profile.dto';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: any) {
    const userId = this.extractUserId(user);
    return this.profileService.getMyProfile(userId);
  }

  @Put('me/patient')
  @Roles(Role.PATIENT)
  updatePatientProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    const userId = this.extractUserId(user);
    return this.profileService.updatePatientProfile(userId, dto);
  }

  @Put('me/clinic')
  @Roles(Role.CLINIC)
  updateClinicProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateClinicProfileDto,
  ) {
    const userId = this.extractUserId(user);
    return this.profileService.updateClinicProfile(userId, dto);
  }

  @Put('me/professional')
  @Roles(Role.PROFESSIONAL)
  updateProfessionalProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfessionalProfileDto,
  ) {
    const userId = this.extractUserId(user);
    return this.profileService.updateProfessionalProfile(userId, dto);
  }

  private extractUserId(user: any): string {
    if (!user) {
      return '';
    }
    if (typeof user === 'string') {
      return user;
    }
    return user.userId ?? user.sub ?? user._id ?? user.id ?? '';
  }
}
