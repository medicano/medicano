import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from './schemas/clinic.schema';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  async create(createClinicDto: CreateClinicDto): Promise<ClinicDocument> {
    const created = new this.clinicModel(createClinicDto);
    return created.save();
  }

  async findAll(): Promise<ClinicDocument[]> {
    return this.clinicModel.find().exec();
  }

  async findOne(id: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Clinic ${id} not found`);
    }
    const clinic = await this.clinicModel.findById(id).exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic ${id} not found`);
    }
    return clinic;
  }

  async update(id: string, updateClinicDto: UpdateClinicDto): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Clinic ${id} not found`);
    }
    const updated = await this.clinicModel
      .findByIdAndUpdate(id, updateClinicDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Clinic ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Clinic ${id} not found`);
    }
    const removed = await this.clinicModel.findByIdAndDelete(id).exec();
    if (!removed) {
      throw new NotFoundException(`Clinic ${id} not found`);
    }
    return removed;
  }

  async findById(id: string): Promise<ClinicDocument> {
    return this.findOne(id);
  }

  async findByUserId(userId: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`Clinic for user ${userId} not found`);
    }
    const clinic = await this.clinicModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic for user ${userId} not found`);
    }
    return clinic;
  }
}
