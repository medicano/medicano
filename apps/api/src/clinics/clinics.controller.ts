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
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  @Roles(Role.CLINIC)
  async create(@CurrentUser() userId: string, @Body() dto: CreateClinicDto) {
    return this.clinicsService.create(userId, dto);
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
  @Roles(Role.CLINIC)
  async update(
    @CurrentUser() userId: string,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateClinicDto,
  ) {
    return this.clinicsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINIC)
  async remove(
    @CurrentUser() userId: string,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.clinicsService.remove(id, userId);
  }

  @Patch(':id/linked-scheduling')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINIC)
  async updateLinkedScheduling(
    @CurrentUser() userId: string,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateLinkedSchedulingDto,
  ) {
    return this.clinicsService.update(id, userId, {
      linkedScheduling: dto.linkedScheduling,
    } as UpdateClinicDto);
  }
}
