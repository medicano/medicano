import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { Clinic, ClinicDocument } from './schemas/clinic.schema';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  async create(createClinicDto: CreateClinicDto): Promise<ClinicDocument> {
    const clinic = new this.clinicModel(createClinicDto);
    return clinic.save();
  }

  async findAll(): Promise<ClinicDocument[]> {
    return this.clinicModel.find().exec();
  }

  async findById(id: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }

    const clinic = await this.clinicModel.findById(id).exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }

    return clinic;
  }

  async update(
    id: string,
    updateClinicDto: UpdateClinicDto,
  ): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }

    const updated = await this.clinicModel
      .findByIdAndUpdate(id, updateClinicDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }

    const deleted = await this.clinicModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }

    return deleted;
  }
}
