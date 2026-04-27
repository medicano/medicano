import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { UpdateLinkedSchedulingDto } from './dto/update-linked-scheduling.dto';

@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateClinicDto) {
    return this.clinicsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.clinicsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id', ParseMongoIdPipe) id: string) {
    return this.clinicsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CLINIC)
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateClinicDto,
  ) {
    return this.clinicsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.clinicsService.remove(id);
  }

  @Patch(':id/linked-scheduling')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINIC)
  async updateLinkedScheduling(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateLinkedSchedulingDto,
  ) {
    return this.clinicsService.update(id, {
      linkedScheduling: dto.linkedScheduling,
    } as UpdateClinicDto);
  }
}
