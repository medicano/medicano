import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { validateWeeklySlots } from '../../common/utils/validate-weekly-slots';
import { ClinicsService } from '../clinics.service';
import { Clinic, ClinicDocument } from '../schemas/clinic.schema';
import { ClinicUnit } from '../schemas/clinic-unit.schema';
import { CreateClinicUnitDto } from '../dto/create-clinic-unit.dto';
import { UpdateClinicUnitDto } from '../dto/update-clinic-unit.dto';

@Injectable()
export class ClinicUnitsService {
  constructor(
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
    private readonly clinicsService: ClinicsService,
  ) {}

  private async assertOwnership(clinicId: string, userId: string): Promise<ClinicDocument> {
    const clinic = await this.clinicsService.findOne(clinicId);
    if (clinic.userId.toString() !== userId) {
      throw new ForbiddenException('Você não é o responsável por este estabelecimento');
    }
    return clinic;
  }

  async list(clinicId: string, userId: string): Promise<ClinicUnit[]> {
    const clinic = await this.assertOwnership(clinicId, userId);
    return clinic.units;
  }

  async addUnit(
    clinicId: string,
    userId: string,
    dto: CreateClinicUnitDto,
  ): Promise<ClinicUnit[]> {
    const clinic = await this.assertOwnership(clinicId, userId);
    if (dto.weeklySlots?.length) {
      validateWeeklySlots(dto.weeklySlots);
    }
    clinic.units.push({
      name: dto.name,
      addressForm: dto.addressForm,
      weeklySlots: dto.weeklySlots ?? [],
      isActive: dto.isActive ?? true,
    } as ClinicUnit);
    await clinic.save();
    return clinic.units;
  }

  async updateUnit(
    clinicId: string,
    unitId: string,
    userId: string,
    dto: UpdateClinicUnitDto,
  ): Promise<ClinicUnit[]> {
    if (!Types.ObjectId.isValid(unitId)) {
      throw new NotFoundException('Unidade não encontrada');
    }
    const clinic = await this.assertOwnership(clinicId, userId);
    const unit = (clinic.units as unknown as Types.DocumentArray<any>).id(unitId);
    if (!unit) {
      throw new NotFoundException('Unidade não encontrada');
    }
    if (dto.weeklySlots?.length) {
      validateWeeklySlots(dto.weeklySlots);
    }
    if (dto.name !== undefined) unit.name = dto.name;
    if (dto.addressForm !== undefined) unit.addressForm = dto.addressForm;
    if (dto.weeklySlots !== undefined) unit.weeklySlots = dto.weeklySlots;
    if (dto.isActive !== undefined) unit.isActive = dto.isActive;
    await clinic.save();
    return clinic.units;
  }

  async removeUnit(clinicId: string, unitId: string, userId: string): Promise<ClinicUnit[]> {
    if (!Types.ObjectId.isValid(unitId)) {
      throw new NotFoundException('Unidade não encontrada');
    }
    const clinic = await this.assertOwnership(clinicId, userId);
    const unit = (clinic.units as unknown as Types.DocumentArray<any>).id(unitId);
    if (!unit) {
      throw new NotFoundException('Unidade não encontrada');
    }
    unit.deleteOne();
    await clinic.save();
    return clinic.units;
  }
}
