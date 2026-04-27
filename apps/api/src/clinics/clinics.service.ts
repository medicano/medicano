import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from './schemas/clinic.schema';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  async create(userId: string, createClinicDto: CreateClinicDto): Promise<ClinicDocument> {
    const clinic = new this.clinicModel({
      ...createClinicDto,
      userId: new Types.ObjectId(userId),
    });
    return clinic.save();
  }

  async findAllByUser(userId: string): Promise<ClinicDocument[]> {
    return this.clinicModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .exec();
  }

  async findById(id: string): Promise<ClinicDocument> {
    const clinic = await this.clinicModel.findById(id).exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }
    return clinic;
  }

  async update(
    id: string,
    userId: string,
    updateClinicDto: UpdateClinicDto,
  ): Promise<ClinicDocument> {
    const clinic = await this.findById(id);

    if (clinic.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to update this clinic');
    }

    Object.assign(clinic, updateClinicDto);
    return clinic.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    const clinic = await this.findById(id);

    if (clinic.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to delete this clinic');
    }

    clinic.isActive = false;
    await clinic.save();
  }

  async countByUser(userId: string): Promise<number> {
    return this.clinicModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });
  }
}
