import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from './schemas/clinic.schema';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { validateWeeklySlots } from '../common/utils/validate-weekly-slots';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  async create(
    createClinicDto: CreateClinicDto,
    userId: string,
  ): Promise<ClinicDocument> {
    if (createClinicDto.weeklySlots?.length) {
      validateWeeklySlots(createClinicDto.weeklySlots);
    }

    try {
      const clinic = new this.clinicModel({
        ...createClinicDto,
        userId: new Types.ObjectId(userId),
      });
      return await clinic.save();
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('CNPJ already registered');
      }
      throw error;
    }
  }

  async findAll(): Promise<ClinicDocument[]> {
    return this.clinicModel.find().exec();
  }

  async findOne(id: string): Promise<ClinicDocument> {
    const clinic = await this.clinicModel
      .findById(new Types.ObjectId(id))
      .exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }
    return clinic;
  }

  async findByUserId(userId: string): Promise<ClinicDocument[]> {
    return this.clinicModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async update(
    id: string,
    updateClinicDto: UpdateClinicDto,
  ): Promise<ClinicDocument> {
    if (updateClinicDto.weeklySlots?.length) {
      validateWeeklySlots(updateClinicDto.weeklySlots);
    }

    try {
      const clinic = await this.clinicModel
        .findByIdAndUpdate(
          new Types.ObjectId(id),
          { $set: updateClinicDto },
          { new: true, runValidators: true },
        )
        .exec();

      if (!clinic) {
        throw new NotFoundException(`Clinic with id ${id} not found`);
      }

      return clinic;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('CNPJ already registered');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.clinicModel
      .findByIdAndDelete(new Types.ObjectId(id))
      .exec();
    if (!result) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as Record<string, unknown>)['code'] === 11000
    );
  }
}
