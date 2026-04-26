import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UserDocument } from '../../auth/schemas/user.schema';
import { Role } from '../../common/enums/role.enum';
import { ClinicsService } from '../clinics.service';
import { CreateAttendantDto } from '../dto/create-attendant.dto';
import { UpdateAttendantDto } from '../dto/update-attendant.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

const BCRYPT_COST = 12;

@Injectable()
export class AttendantsService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    private readonly clinicsService: ClinicsService,
  ) {}

  private async assertClinicOwnership(
    clinicId: string,
    currentUserId: string,
  ): Promise<void> {
    const clinic: any = await this.clinicsService.findById(clinicId);
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const ownerId =
      clinic.userId !== undefined && clinic.userId !== null
        ? clinic.userId.toString()
        : null;

    if (!ownerId || ownerId !== currentUserId) {
      throw new ForbiddenException('You do not own this clinic');
    }
  }

  async createAttendant(
    clinicId: string,
    currentUserId: string,
    dto: CreateAttendantDto,
  ): Promise<UserDocument> {
    await this.assertClinicOwnership(clinicId, currentUserId);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    try {
      const created = await this.userModel.create({
        role: Role.ATTENDANT,
        clinicId,
        username: dto.username,
        passwordHash,
        displayName: dto.displayName,
        isActive: true,
      });

      const sanitized = created.toObject();
      delete (sanitized as any).passwordHash;

      return sanitized as unknown as UserDocument;
    } catch (err: any) {
      if (err && err.code === 11000) {
        throw new ConflictException('Username already taken in this clinic');
      }
      throw err;
    }
  }

  async listAttendants(
    clinicId: string,
    currentUserId: string,
  ): Promise<UserDocument[]> {
    await this.assertClinicOwnership(clinicId, currentUserId);

    return this.userModel
      .find({
        role: Role.ATTENDANT,
        clinicId,
      })
      .select('-passwordHash')
      .sort({ displayName: 1 })
      .exec();
  }

  async updateAttendant(
    clinicId: string,
    attendantId: string,
    currentUserId: string,
    dto: UpdateAttendantDto,
  ): Promise<UserDocument> {
    await this.assertClinicOwnership(clinicId, currentUserId);

    if (!Types.ObjectId.isValid(attendantId)) {
      throw new BadRequestException('Invalid attendant id');
    }

    const update: Record<string, unknown> = {};

    if (dto.displayName !== undefined) {
      update.displayName = dto.displayName;
    }

    if (dto.isActive !== undefined) {
      update.isActive = dto.isActive;
    }

    if (dto.password) {
      update.passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    }

    const updated = await this.userModel
      .findOneAndUpdate(
        {
          _id: attendantId,
          role: Role.ATTENDANT,
          clinicId,
        },
        update,
        { new: true },
      )
      .select('-passwordHash')
      .exec();

    if (!updated) {
      throw new NotFoundException('Attendant not found in this clinic');
    }

    return updated;
  }

  async removeAttendant(
    clinicId: string,
    attendantId: string,
    currentUserId: string,
  ): Promise<{ success: true }> {
    await this.assertClinicOwnership(clinicId, currentUserId);

    if (!Types.ObjectId.isValid(attendantId)) {
      throw new BadRequestException('Invalid attendant id');
    }

    const result = await this.userModel
      .deleteOne({
        _id: attendantId,
        role: Role.ATTENDANT,
        clinicId,
      })
      .exec();

    if (!result || result.deletedCount === 0) {
      throw new NotFoundException('Attendant not found in this clinic');
    }

    return { success: true };
  }
}
