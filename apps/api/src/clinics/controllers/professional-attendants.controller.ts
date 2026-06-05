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

// Atendentes de um profissional autônomo. Mesmo recurso de atendente, mas com o
// dono sendo um Professional em vez de uma Clinic.
@Controller('professionals/:professionalId/attendants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PROFESSIONAL)
export class ProfessionalAttendantsController {
  constructor(private readonly attendantsService: AttendantsService) {}

  @Post()
  async create(
    @Param('professionalId') professionalId: string,
    @CurrentUser() currentUserId: string,
    @Body() dto: CreateAttendantDto,
  ) {
    return this.attendantsService.createForProfessional(professionalId, currentUserId, dto);
  }

  @Get()
  async list(
    @Param('professionalId') professionalId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.attendantsService.listForProfessional(professionalId, currentUserId);
  }

  @Put(':attendantId')
  async update(
    @Param('professionalId') professionalId: string,
    @Param('attendantId', ParseMongoIdPipe) attendantId: string,
    @CurrentUser() currentUserId: string,
    @Body() dto: UpdateAttendantDto,
  ) {
    return this.attendantsService.updateForProfessional(
      professionalId,
      attendantId,
      currentUserId,
      dto,
    );
  }

  @Delete(':attendantId')
  @HttpCode(204)
  async remove(
    @Param('professionalId') professionalId: string,
    @Param('attendantId', ParseMongoIdPipe) attendantId: string,
    @CurrentUser() currentUserId: string,
  ): Promise<void> {
    await this.attendantsService.removeForProfessional(professionalId, attendantId, currentUserId);
  }
}
