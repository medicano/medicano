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
import {
  ProfessionalPlan,
  PROFESSIONAL_PLAN_ATTENDANT_LIMITS,
} from '../../common/enums/professional-plan.enum';
import {
  Professional,
  ProfessionalDocument,
} from '../../professionals/schemas/professional.schema';
import { PLAN_ATTENDANT_LIMITS } from '../../subscriptions/constants/subscription.constants';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { ClinicsService } from '../clinics.service';
import { CreateAttendantDto } from '../dto/create-attendant.dto';
import { UpdateAttendantDto } from '../dto/update-attendant.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

const BCRYPT_COST = 12;

// Dono do atendente: clínica ({ clinicId }) ou profissional ({ professionalId }).
type OwnerFilter = { clinicId: string } | { professionalId: string };

@Injectable()
export class AttendantsService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    private readonly clinicsService: ClinicsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // Bloqueia a criação quando o dono já atingiu o limite de atendentes do plano.
  private async assertWithinAttendantLimit(
    owner: OwnerFilter,
    limit: number,
  ): Promise<void> {
    if (limit < 0) return; // ilimitado
    const count = await this.userModel
      .countDocuments({ role: Role.ATTENDANT, ...owner })
      .exec();
    if (count >= limit) {
      throw new ForbiddenException(
        `Limite de ${limit} atendentes do plano atingido. Faça upgrade para adicionar mais.`,
      );
    }
  }

  private async assertClinicOwnership(
    clinicId: string,
    currentUserId: string,
  ): Promise<void> {
    const clinic: any = await this.clinicsService.findById(clinicId);
    if (!clinic) {
      throw new NotFoundException('Estabelecimento de saúde não encontrado');
    }
    const ownerId =
      clinic.userId !== undefined && clinic.userId !== null
        ? clinic.userId.toString()
        : null;
    if (!ownerId || ownerId !== currentUserId) {
      throw new ForbiddenException('Você não é o responsável por este estabelecimento');
    }
  }

  private async assertProfessionalOwnership(
    professionalId: string,
    currentUserId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(professionalId)) {
      throw new NotFoundException('Profissional não encontrado');
    }
    const professional = await this.professionalModel
      .findById(professionalId)
      .select('userId')
      .lean()
      .exec();
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }
    if ((professional.userId as Types.ObjectId).toString() !== currentUserId) {
      throw new ForbiddenException('Você não é o responsável por este perfil');
    }
  }

  // ─── núcleo genérico (independe do tipo de dono) ───────────────────────────

  private async createForOwner(
    owner: OwnerFilter,
    dto: CreateAttendantDto,
  ): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    try {
      const created = await this.userModel.create({
        role: Role.ATTENDANT,
        ...owner,
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
        throw new ConflictException('Nome de usuário já em uso');
      }
      throw err;
    }
  }

  private listForOwner(owner: OwnerFilter): Promise<UserDocument[]> {
    return this.userModel
      .find({ role: Role.ATTENDANT, ...owner })
      .select('-passwordHash')
      .sort({ displayName: 1 })
      .exec();
  }

  private async updateForOwner(
    owner: OwnerFilter,
    attendantId: string,
    dto: UpdateAttendantDto,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(attendantId)) {
      throw new BadRequestException('ID do atendente inválido');
    }
    const update: Record<string, unknown> = {};
    if (dto.displayName !== undefined) update.displayName = dto.displayName;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.password) update.passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: attendantId, role: Role.ATTENDANT, ...owner },
        update,
        { new: true },
      )
      .select('-passwordHash')
      .exec();
    if (!updated) {
      throw new NotFoundException('Atendente não encontrado');
    }
    return updated;
  }

  private async removeForOwner(
    owner: OwnerFilter,
    attendantId: string,
  ): Promise<{ success: true }> {
    if (!Types.ObjectId.isValid(attendantId)) {
      throw new BadRequestException('ID do atendente inválido');
    }
    const result = await this.userModel
      .deleteOne({ _id: attendantId, role: Role.ATTENDANT, ...owner })
      .exec();
    if (!result || result.deletedCount === 0) {
      throw new NotFoundException('Atendente não encontrado');
    }
    return { success: true };
  }

  // ─── atendentes de clínica ─────────────────────────────────────────────────

  async createAttendant(
    clinicId: string,
    currentUserId: string,
    dto: CreateAttendantDto,
  ): Promise<UserDocument> {
    await this.assertClinicOwnership(clinicId, currentUserId);
    const subscription = await this.subscriptionsService.ensureForClinic(clinicId);
    await this.assertWithinAttendantLimit(
      { clinicId },
      PLAN_ATTENDANT_LIMITS[subscription.plan],
    );
    return this.createForOwner({ clinicId }, dto);
  }

  async listAttendants(
    clinicId: string,
    currentUserId: string,
  ): Promise<UserDocument[]> {
    await this.assertClinicOwnership(clinicId, currentUserId);
    return this.listForOwner({ clinicId });
  }

  async updateAttendant(
    clinicId: string,
    attendantId: string,
    currentUserId: string,
    dto: UpdateAttendantDto,
  ): Promise<UserDocument> {
    await this.assertClinicOwnership(clinicId, currentUserId);
    return this.updateForOwner({ clinicId }, attendantId, dto);
  }

  async removeAttendant(
    clinicId: string,
    attendantId: string,
    currentUserId: string,
  ): Promise<{ success: true }> {
    await this.assertClinicOwnership(clinicId, currentUserId);
    return this.removeForOwner({ clinicId }, attendantId);
  }

  // ─── atendentes de profissional autônomo ───────────────────────────────────

  async createForProfessional(
    professionalId: string,
    currentUserId: string,
    dto: CreateAttendantDto,
  ): Promise<UserDocument> {
    await this.assertProfessionalOwnership(professionalId, currentUserId);
    const professional = await this.professionalModel
      .findById(professionalId)
      .select('plan')
      .lean()
      .exec();
    const plan = (professional?.plan as ProfessionalPlan) ?? ProfessionalPlan.FREE;
    await this.assertWithinAttendantLimit(
      { professionalId },
      PROFESSIONAL_PLAN_ATTENDANT_LIMITS[plan],
    );
    return this.createForOwner({ professionalId }, dto);
  }

  async listForProfessional(
    professionalId: string,
    currentUserId: string,
  ): Promise<UserDocument[]> {
    await this.assertProfessionalOwnership(professionalId, currentUserId);
    return this.listForOwner({ professionalId });
  }

  async updateForProfessional(
    professionalId: string,
    attendantId: string,
    currentUserId: string,
    dto: UpdateAttendantDto,
  ): Promise<UserDocument> {
    await this.assertProfessionalOwnership(professionalId, currentUserId);
    return this.updateForOwner({ professionalId }, attendantId, dto);
  }

  async removeForProfessional(
    professionalId: string,
    attendantId: string,
    currentUserId: string,
  ): Promise<{ success: true }> {
    await this.assertProfessionalOwnership(professionalId, currentUserId);
    return this.removeForOwner({ professionalId }, attendantId);
  }
}
