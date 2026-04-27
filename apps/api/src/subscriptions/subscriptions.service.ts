import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
  SubscriptionStatus,
  PLAN_PROFESSIONAL_LIMITS,
} from './schemas/subscription.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const subscription = new this.subscriptionModel({
      ...createSubscriptionDto,
      ownerId: new Types.ObjectId(createSubscriptionDto.ownerId),
      status: SubscriptionStatus.ACTIVE,
    });
    return subscription.save();
  }

  async findAll(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel.find().exec();
  }

  async findById(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findById(new Types.ObjectId(id))
      .exec();
    if (!subscription) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }
    return subscription;
  }

  async findByOwner(
    ownerType: 'clinic' | 'professional',
    ownerId: string,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ ownerType, ownerId: new Types.ObjectId(ownerId) })
      .exec();
  }

  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const updated = await this.subscriptionModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: updateSubscriptionDto },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.subscriptionModel
      .findByIdAndDelete(new Types.ObjectId(id))
      .exec();
    if (!result) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }
  }

  async enforceClinicProfessionalLimit(
    clinicId: string,
    currentProfessionalCount: number,
  ): Promise<void> {
    const subscription = await this.findByOwner('clinic', clinicId);

    // Default to FREE when no subscription (e.g., trial).
    const planValue = subscription?.plan ?? SubscriptionPlan.FREE;
    const plan = (Object.values(SubscriptionPlan) as string[]).includes(
      planValue,
    )
      ? (planValue as SubscriptionPlan)
      : SubscriptionPlan.FREE;

    const limit = PLAN_PROFESSIONAL_LIMITS[plan];
    if (limit === -1) return; // unlimited

    if (currentProfessionalCount >= limit) {
      throw new ForbiddenException(
        `Professional limit reached for current subscription plan (${plan}). Limit: ${limit}.`,
      );
    }
  }
}
