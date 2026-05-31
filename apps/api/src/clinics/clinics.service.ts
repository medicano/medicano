import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from './schemas/clinic.schema';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { validateWeeklySlots } from '../common/utils/validate-weekly-slots';
import { ClinicProfessional, ClinicProfessionalDocument } from '../professionals/schemas/clinic-professional.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(ClinicProfessional.name)
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async create(userId: string, createClinicDto: CreateClinicDto): Promise<ClinicDocument> {
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
        throw new ConflictException('CNPJ já cadastrado');
      }
      throw error;
    }
  }

  async findAll(): Promise<ClinicDocument[]> {
    return this.clinicModel.find().exec();
  }

  async findOne(id: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Estabelecimento de saúde não encontrado');
    }
    const clinic = await this.clinicModel.findById(id).exec();
    if (!clinic) {
      throw new NotFoundException('Estabelecimento de saúde não encontrado');
    }
    return clinic;
  }

  async findById(id: string): Promise<ClinicDocument> {
    return this.findOne(id);
  }

  async findByUserId(userId: string): Promise<ClinicDocument[]> {
    return this.clinicModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  async findAllByUser(userId: string): Promise<ClinicDocument[]> {
    return this.findByUserId(userId);
  }

  async update(
    id: string,
    userId: string,
    updateClinicDto: UpdateClinicDto,
  ): Promise<ClinicDocument> {
    if (updateClinicDto.weeklySlots?.length) {
      validateWeeklySlots(updateClinicDto.weeklySlots);
    }

    const clinic = await this.findOne(id);

    if (clinic.userId.toString() !== userId) {
      throw new ForbiddenException('Você não é o responsável por este estabelecimento');
    }

    Object.assign(clinic, updateClinicDto);

    try {
      return await clinic.save();
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('CNPJ já cadastrado');
      }
      throw error;
    }
  }

  async findProfessionalsByClinicId(clinicId: string): Promise<ProfessionalDocument[]> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new NotFoundException('ID do estabelecimento inválido');
    }
    const links = await this.clinicProfessionalModel
      .find({ clinicId: new Types.ObjectId(clinicId) })
      .select('professionalId')
      .lean()
      .exec();
    const professionalIds = links.map((l) => l.professionalId as Types.ObjectId);
    return this.professionalModel.find({ _id: { $in: professionalIds } }).exec();
  }

  async addSpecialty(clinicId: string, specialty: string): Promise<void> {
    await this.clinicModel
      .findByIdAndUpdate(clinicId, { $addToSet: { specialties: specialty } })
      .exec();
  }

  async removeSpecialtyIfUnused(clinicId: string, specialty: string): Promise<void> {
    const remainingLinks = await this.clinicProfessionalModel
      .find({ clinicId: new Types.ObjectId(clinicId) })
      .select('professionalId')
      .lean()
      .exec();
    const remainingIds = remainingLinks.map((l) => l.professionalId as Types.ObjectId);
    const stillUsed = await this.professionalModel.exists({
      _id: { $in: remainingIds },
      specialty,
    });
    if (!stillUsed) {
      await this.clinicModel
        .findByIdAndUpdate(clinicId, { $pull: { specialties: specialty } })
        .exec();
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const clinic = await this.findOne(id);
    if (clinic.userId.toString() !== userId) {
      throw new ForbiddenException('Você não é o responsável por este estabelecimento');
    }
    await this.clinicModel.findByIdAndDelete(id).exec();
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
