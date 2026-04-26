import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { CreateAttendantDto } from '../dto/create-attendant.dto';
import { UpdateAttendantDto } from '../dto/update-attendant.dto';
import { AttendantsService } from '../services/attendants.service';

@Controller('clinics/:clinicId/attendants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLINIC)
export class AttendantsController {
  constructor(private readonly attendantsService: AttendantsService) {}

  private extractUserId(user: any): string {
    if (!user) {
      return '';
    }
    if (typeof user === 'string') {
      return user;
    }
    if (user.userId) {
      return String(user.userId);
    }
    if (user.sub) {
      return String(user.sub);
    }
    if (user._id) {
      return String(user._id);
    }
    if (user.id) {
      return String(user.id);
    }
    return '';
  }

  @Post()
  async create(
    @Param('clinicId') clinicId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAttendantDto,
  ) {
    const currentUserId = this.extractUserId(user);
    return this.attendantsService.createAttendant(clinicId, currentUserId, dto);
  }

  @Get()
  async list(
    @Param('clinicId') clinicId: string,
    @CurrentUser() user: any,
  ) {
    const currentUserId = this.extractUserId(user);
    return this.attendantsService.listAttendants(clinicId, currentUserId);
  }

  @Put(':attendantId')
  async update(
    @Param('clinicId') clinicId: string,
    @Param('attendantId', ParseMongoIdPipe) attendantId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateAttendantDto,
  ) {
    const currentUserId = this.extractUserId(user);
    return this.attendantsService.updateAttendant(
      clinicId,
      attendantId,
      currentUserId,
      dto,
    );
  }

  @Delete(':attendantId')
  @HttpCode(204)
  async remove(
    @Param('clinicId') clinicId: string,
    @Param('attendantId') attendantId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    const currentUserId = this.extractUserId(user);
    await this.attendantsService.removeAttendant(
      clinicId,
      attendantId,
      currentUserId,
    );
  }
}
