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

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

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
    const sub = await this.subscriptionModel
      .findOne({ clinicId, status: SubscriptionStatus.ACTIVE })
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
