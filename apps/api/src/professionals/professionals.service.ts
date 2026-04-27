import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Professional, ProfessionalDocument } from './schemas/professional.schema';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async create(createProfessionalDto: CreateProfessionalDto): Promise<ProfessionalDocument> {
    const created = new this.professionalModel(createProfessionalDto);
    return created.save();
  }

  async findAll(): Promise<ProfessionalDocument[]> {
    return this.professionalModel.find().exec();
  }

  async findOne(id: string): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Professional ${id} not found`);
    }
    const professional = await this.professionalModel.findById(id).exec();
    if (!professional) {
      throw new NotFoundException(`Professional ${id} not found`);
    }
    return professional;
  }

  async update(
    id: string,
    updateProfessionalDto: UpdateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Professional ${id} not found`);
    }
    const updated = await this.professionalModel
      .findByIdAndUpdate(id, updateProfessionalDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Professional ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Professional ${id} not found`);
    }
    const removed = await this.professionalModel.findByIdAndDelete(id).exec();
    if (!removed) {
      throw new NotFoundException(`Professional ${id} not found`);
    }
    return removed;
  }

  async findByUserId(userId: string): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`Professional for user ${userId} not found`);
    }
    const professional = await this.professionalModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (!professional) {
      throw new NotFoundException(`Professional for user ${userId} not found`);
    }
    return professional;
  }
}
