import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { UpdateHealthInsurancesDto } from '../dto/update-health-insurances.dto';
import { ClinicHealthInsurancesService } from '../services/clinic-health-insurances.service';

@Controller('clinics/:clinicId/health-insurances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLINIC)
export class ClinicHealthInsurancesController {
  constructor(private readonly service: ClinicHealthInsurancesService) {}

  @Put()
  async update(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateHealthInsurancesDto,
  ) {
    const healthInsurances = await this.service.update(clinicId, userId, dto.healthInsurances);
    return { healthInsurances };
  }
}
