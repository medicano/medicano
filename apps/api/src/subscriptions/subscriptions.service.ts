import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PLAN_PROFESSIONAL_LIMITS,
  SubscriptionPlan,
  SubscriptionStatus,
} from './constants/subscription.constants';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscription.schema';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  // Every clinic must own a subscription, otherwise it (and its professionals)
  // are invisible in patient search. Idempotent: returns the existing one or
  // creates a FREE/trial subscription. Safe under races thanks to the unique
  // index on Subscription.clinicId.
  async ensureForClinic(clinicId: string): Promise<SubscriptionDocument> {
    const clinicObjectId = new Types.ObjectId(clinicId);
    const existing = await this.subscriptionModel
      .findOne({ clinicId: clinicObjectId })
      .exec();
    if (existing) {
      return existing;
    }
    try {
      return await this.subscriptionModel.create({
        clinicId: clinicObjectId,
        plan: SubscriptionPlan.FREE,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return this.subscriptionModel
          .findOne({ clinicId: clinicObjectId })
          .exec() as Promise<SubscriptionDocument>;
      }
      throw error;
    }
  }

  // Resolves the subscription of the clinic owned by the given user, creating
  // one if missing. Used by the "my subscription" endpoints.
  async getOrCreateForUser(userId: string): Promise<SubscriptionDocument> {
    const clinic = await this.clinicModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('_id')
      .exec();
    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada para este usuário');
    }
    return this.ensureForClinic((clinic._id as Types.ObjectId).toString());
  }

  // Changes the plan of the current user's clinic. A paid plan goes ACTIVE so the
  // higher professional limit applies; FREE falls back to TRIAL.
  async updatePlanForUser(
    userId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.getOrCreateForUser(userId);
    const plan = dto.plan ?? subscription.plan;
    const status =
      dto.status ??
      (plan === SubscriptionPlan.FREE
        ? SubscriptionStatus.TRIAL
        : SubscriptionStatus.ACTIVE);
    return this.updateSubscription((subscription._id as Types.ObjectId).toString(), {
      ...dto,
      plan,
      status,
    });
  }

  async create(dto: CreateSubscriptionDto): Promise<SubscriptionDocument> {
    try {
      const subscription = new this.subscriptionModel({
        clinicId: new Types.ObjectId(dto.clinicId),
        plan: dto.plan,
        ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
      });
      return await subscription.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'Já existe uma assinatura para este estabelecimento',
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }
    return subscription;
  }

  async findByClinicId(
    clinicId: string,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel.findOne({ clinicId }).exec();
  }

  async getSubscriptionByClinicId(
    clinicId: string,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel.findOne({ clinicId }).exec();
  }

  async createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionDocument> {
    return this.subscriptionModel.create({
      ...dto,
      clinicId: new Types.ObjectId(dto.clinicId),
    });
  }

  async updateSubscription(
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const updatePayload: Partial<{
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      expiresAt: Date;
    }> = {};

    if (dto.plan !== undefined) updatePayload.plan = dto.plan;
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.expiresAt !== undefined)
      updatePayload.expiresAt = new Date(dto.expiresAt);

    const subscription = await this.subscriptionModel
      .findOneAndUpdate({ _id: id }, { $set: updatePayload }, { new: true })
      .exec();

    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    return subscription;
  }

  async cancelSubscription(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOneAndUpdate(
        { _id: id },
        { $set: { status: SubscriptionStatus.INACTIVE } },
        { new: true },
      )
      .exec();

    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    return subscription;
  }

  async update(
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    return this.updateSubscription(id, dto);
  }

  async cancel(id: string): Promise<SubscriptionDocument> {
    return this.cancelSubscription(id);
  }

  async enforceClinicProfessionalLimit(
    clinicId: string,
    currentCount: number,
  ): Promise<void> {
    // A trial of a paid plan must grant that plan's limit too — gate by the
    // plan whenever the subscription is active OR on trial.
    const sub = await this.subscriptionModel
      .findOne({
        clinicId,
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      })
      .exec();
    const plan = sub?.plan ?? SubscriptionPlan.FREE;
    const limit = PLAN_PROFESSIONAL_LIMITS[plan];

    if (limit === -1) {
      return;
    }

    if (currentCount >= limit) {
      throw new ForbiddenException(
        'Limite de profissionais atingido para o plano atual',
      );
    }
  }
}
