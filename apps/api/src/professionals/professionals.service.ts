import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
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
export class ProfessionalsService implements OnModuleInit {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(ClinicProfessional.name)
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.professionalModel.collection.dropIndex('cpf_1');
    } catch {
      // índice já removido ou nunca existiu
    }
  }

  async create(userId: string, createProfessionalDto: CreateProfessionalDto): Promise<ProfessionalDocument> {
    if (createProfessionalDto.cpf) {
      const existing = await this.professionalModel.findOne({ cpf: createProfessionalDto.cpf }).exec();
      if (existing) {
        throw new ConflictException('Já existe um profissional com este CPF');
      }
    }
    try {
      const professional = new this.professionalModel({ ...createProfessionalDto, userId });
      return await professional.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error?.keyPattern?.['userId']) {
          throw new ConflictException('Este usuário já possui um perfil de profissional');
        }
        throw new ConflictException('Erro de chave duplicada');
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
      throw new NotFoundException('Profissional não encontrado');
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
    if (updateProfessionalDto.cpf) {
      const existing = await this.professionalModel
        .findOne({ cpf: updateProfessionalDto.cpf, _id: { $ne: new Types.ObjectId(id) } })
        .exec();
      if (existing) {
        throw new ConflictException('Já existe um profissional com este CPF');
      }
    }
    const professional = await this.professionalModel
      .findByIdAndUpdate(id, { $set: updateProfessionalDto }, { new: true, runValidators: true })
      .exec();
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }
    return professional;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.professionalModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Profissional não encontrado');
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
      throw new NotFoundException('Profissional não encontrado');
    }
    return professional;
  }

  async updateByUserId(
    userId: string,
    updateData: Partial<UpdateProfessionalDto>,
  ): Promise<ProfessionalDocument> {
    if (updateData.cpf) {
      const existing = await this.professionalModel
        .findOne({ cpf: updateData.cpf, userId: { $ne: userId } })
        .exec();
      if (existing) {
        throw new ConflictException('Já existe um profissional com este CPF');
      }
    }
    const professional = await this.professionalModel
      .findOneAndUpdate({ userId }, { $set: updateData }, { new: true, runValidators: true })
      .exec();
    if (!professional) {
      throw new NotFoundException('Perfil de profissional não encontrado');
    }
    return professional;
  }
}
