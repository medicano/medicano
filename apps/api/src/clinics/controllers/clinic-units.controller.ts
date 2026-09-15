import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CreateClinicUnitDto } from '../dto/create-clinic-unit.dto';
import { UpdateClinicUnitDto } from '../dto/update-clinic-unit.dto';
import { ClinicUnitsService } from '../services/clinic-units.service';

@Controller('clinics/:clinicId/units')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLINIC)
export class ClinicUnitsController {
  constructor(private readonly clinicUnitsService: ClinicUnitsService) {}

  @Get()
  async list(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
    @CurrentUser() userId: string,
  ) {
    return this.clinicUnitsService.list(clinicId, userId);
  }

  @Post()
  async create(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
    @CurrentUser() userId: string,
    @Body() dto: CreateClinicUnitDto,
  ) {
    return this.clinicUnitsService.addUnit(clinicId, userId, dto);
  }

  @Put(':unitId')
  async update(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
    @Param('unitId') unitId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateClinicUnitDto,
  ) {
    return this.clinicUnitsService.updateUnit(clinicId, unitId, userId, dto);
  }

  @Delete(':unitId')
  async remove(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
    @Param('unitId') unitId: string,
    @CurrentUser() userId: string,
  ) {
    return this.clinicUnitsService.removeUnit(clinicId, unitId, userId);
  }
}
