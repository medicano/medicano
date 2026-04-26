import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscription.schema';

type SubscriptionOwnerType = 'clinic' | 'professional';

type SubscriptionCreateInput = CreateSubscriptionDto & {
  ownerType?: SubscriptionOwnerType;
  ownerId?: string;
  clinicId?: string;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const subscriptionData: SubscriptionCreateInput = {
      ...(createSubscriptionDto as SubscriptionCreateInput),
    };

    if (
      !subscriptionData.ownerType &&
      !subscriptionData.ownerId &&
      subscriptionData.clinicId
    ) {
      subscriptionData.ownerType = 'clinic';
      subscriptionData.ownerId = subscriptionData.clinicId;
    }

    const createdSubscription = new this.subscriptionModel(subscriptionData);
    return createdSubscription.save();
  }

  async findAll(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel.find().exec();
  }

  async findOne(id: string): Promise<SubscriptionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subscription id');
    }

    const subscription = await this.subscriptionModel.findById(id).exec();

    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    return subscription;
  }

  async findByOwner(
    ownerType: SubscriptionOwnerType,
    ownerId: string,
  ): Promise<SubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid ownerId');
    }

    return this.subscriptionModel
      .findOne({
        ownerType,
        ownerId: new Types.ObjectId(ownerId),
      })
      .exec();
  }

  async findActiveOwnerIds(
    ownerType: SubscriptionOwnerType,
  ): Promise<Types.ObjectId[]> {
    const subs = await this.subscriptionModel
      .find({
        ownerType,
        status: 'active',
        expiresAt: { $gt: new Date() },
      })
      .select('ownerId')
      .exec();

    return subs.map((s) => s.ownerId as Types.ObjectId);
  }

  /**
   * @deprecated use findByOwner('clinic', clinicId) instead
   */
  async findByClinicId(
    clinicId: string,
  ): Promise<SubscriptionDocument | null> {
    return this.findByOwner('clinic', clinicId);
  }

  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subscription id');
    }

    const updated = await this.subscriptionModel
      .findByIdAndUpdate(id, updateSubscriptionDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<SubscriptionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subscription id');
    }

    const removed = await this.subscriptionModel
      .findByIdAndDelete(id)
      .exec();

    if (!removed) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    return removed;
  }

  async enforceClinicProfessionalLimit(
    clinicId: string,
    currentProfessionalCount: number,
  ): Promise<void> {
    const subscription = await this.findByOwner('clinic', clinicId);

    if (!subscription) {
      throw new ForbiddenException(
        'Clinic does not have an active subscription',
      );
    }

    if (subscription.status !== 'active') {
      throw new ForbiddenException('Clinic subscription is not active');
    }

    if (
      subscription.expiresAt &&
      subscription.expiresAt.getTime() <= Date.now()
    ) {
      throw new ForbiddenException('Clinic subscription has expired');
    }

    const maxProfessionals =
      (subscription as unknown as { maxProfessionals?: number })
        .maxProfessionals ?? 0;

    if (
      typeof maxProfessionals === 'number' &&
      maxProfessionals > 0 &&
      currentProfessionalCount >= maxProfessionals
    ) {
      throw new ForbiddenException(
        'Professional limit reached for current subscription plan',
      );
    }
  }
}
