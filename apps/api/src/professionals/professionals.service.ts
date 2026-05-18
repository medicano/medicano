import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Professional, ProfessionalDocument } from './schemas/professional.schema';
import { ClinicProfessional, ClinicProfessionalDocument } from './schemas/clinic-professional.schema';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdateWeeklySlotsDto } from './dto/update-weekly-slots.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(ClinicProfessional.name)
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  async create(userId: string, createProfessionalDto: CreateProfessionalDto): Promise<ProfessionalDocument> {
    try {
      const professional = new this.professionalModel({ ...createProfessionalDto, userId });
      return await professional.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        const keyPattern = error?.keyPattern ?? {};
        if (keyPattern['cpf']) {
          throw new ConflictException('A professional with this CPF already exists');
        }
        if (keyPattern['userId']) {
          throw new ConflictException('A professional profile already exists for this user');
        }
        throw new ConflictException('Duplicate key error');
      }
      throw error;
    }
  }

  async findAll(): Promise<ProfessionalDocument[]> {
    return this.professionalModel.find().exec();
  }

  async findById(id: string): Promise<ProfessionalDocument & { clinicId?: string; clinicName?: string }> {
    const professional = await this.professionalModel.findById(id).exec();
    if (!professional) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }
    const link = await this.clinicProfessionalModel
      .findOne({ professionalId: new Types.ObjectId(id) })
      .lean()
      .exec();
    const result = professional.toObject() as ProfessionalDocument & { clinicId?: string; clinicName?: string };
    if (link) {
      result.clinicId = link.clinicId.toString();
      const clinic = await this.clinicModel.findById(link.clinicId).select('name').lean().exec();
      if (clinic) {
        result.clinicName = clinic.name;
      }
    }
    return result;
  }

  async findByUserId(userId: string): Promise<ProfessionalDocument | null> {
    return this.professionalModel.findOne({ userId }).exec();
  }

  async update(id: string, updateProfessionalDto: UpdateProfessionalDto): Promise<ProfessionalDocument> {
    try {
      const professional = await this.professionalModel
        .findByIdAndUpdate(id, { $set: updateProfessionalDto }, { new: true, runValidators: true })
        .exec();
      if (!professional) {
        throw new NotFoundException(`Professional with id ${id} not found`);
      }
      return professional;
    } catch (error: any) {
      if (error?.code === 11000) {
        const keyPattern = error?.keyPattern ?? {};
        if (keyPattern['cpf']) {
          throw new ConflictException('A professional with this CPF already exists');
        }
        if (keyPattern['userId']) {
          throw new ConflictException('A professional profile already exists for this user');
        }
        throw new ConflictException('Duplicate key error');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.professionalModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }
    return { deleted: true };
  }

  async updateWeeklySlots(id: string, updateWeeklySlotsDto: UpdateWeeklySlotsDto): Promise<ProfessionalDocument> {
    const professional = await this.professionalModel
      .findByIdAndUpdate(
        id,
        { $set: { weeklySlots: updateWeeklySlotsDto.weeklySlots } },
        { new: true, runValidators: true },
      )
      .exec();
    if (!professional) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }
    return professional;
  }

  async updateByUserId(
    userId: string,
    updateData: Partial<UpdateProfessionalDto>,
  ): Promise<ProfessionalDocument> {
    try {
      const professional = await this.professionalModel
        .findOneAndUpdate({ userId }, { $set: updateData }, { new: true, runValidators: true })
        .exec();
      if (!professional) {
        throw new NotFoundException(`Professional profile for user ${userId} not found`);
      }
      return professional;
    } catch (error: any) {
      if (error?.code === 11000) {
        const keyPattern = error?.keyPattern ?? {};
        if (keyPattern['cpf']) {
          throw new ConflictException('A professional with this CPF already exists');
        }
        throw new ConflictException('Duplicate key error');
      }
      throw error;
    }
  }
}
