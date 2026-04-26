import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import {
  Professional,
  ProfessionalDocument,
} from './schemas/professional.schema';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async create(
    createProfessionalDto: CreateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(createProfessionalDto.userId)) {
      throw new NotFoundException(
        `User with id ${createProfessionalDto.userId} not found`,
      );
    }

    try {
      const professional = new this.professionalModel(createProfessionalDto);
      return await professional.save();
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err?.code === 11000) {
        throw new ConflictException('Professional already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<ProfessionalDocument[]> {
    return this.professionalModel.find().exec();
  }

  async findById(id: string): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }

    const professional = await this.professionalModel.findById(id).exec();
    if (!professional) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }

    return professional;
  }

  async update(
    id: string,
    updateProfessionalDto: UpdateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }

    const updated = await this.professionalModel
      .findByIdAndUpdate(id, updateProfessionalDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }

    const deleted = await this.professionalModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }

    return deleted;
  }
}
