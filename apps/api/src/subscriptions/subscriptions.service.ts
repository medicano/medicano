import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import {
  SubscriptionPlan,
  SUBSCRIPTION_PLAN_LIMITS,
} from './constants/subscription.constants';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async create(
    userId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const existing = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (existing) {
      throw new BadRequestException('User already has an active subscription');
    }

    const limits = SUBSCRIPTION_PLAN_LIMITS[createSubscriptionDto.plan];

    const subscription = new this.subscriptionModel({
      userId: new Types.ObjectId(userId),
      plan: createSubscriptionDto.plan,
      clinicLimit: limits.clinicLimit,
      appointmentLimit: limits.appointmentLimit,
      aiTriageEnabled: limits.aiTriageEnabled,
      prioritySupport: limits.prioritySupport,
      isActive: true,
      expiresAt: createSubscriptionDto.expiresAt,
    });

    return subscription.save();
  }

  async findByUserId(userId: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true })
      .exec();
  }

  async findById(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }
    return subscription;
  }

  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

    if (updateSubscriptionDto.plan) {
      const limits = SUBSCRIPTION_PLAN_LIMITS[updateSubscriptionDto.plan];
      subscription.plan = updateSubscriptionDto.plan;
      subscription.clinicLimit = limits.clinicLimit;
      subscription.appointmentLimit = limits.appointmentLimit;
      subscription.aiTriageEnabled = limits.aiTriageEnabled;
      subscription.prioritySupport = limits.prioritySupport;
    }

    if (updateSubscriptionDto.isActive !== undefined) {
      subscription.isActive = updateSubscriptionDto.isActive;
    }

    if (updateSubscriptionDto.expiresAt !== undefined) {
      subscription.expiresAt = updateSubscriptionDto.expiresAt;
    }

    return subscription.save();
  }

  async hasReachedClinicLimit(userId: string, currentClinicCount: number): Promise<boolean> {
    const subscription = await this.findByUserId(userId);
    if (!subscription) {
      return true;
    }
    return currentClinicCount >= subscription.clinicLimit;
  }

  async getActivePlan(userId: string): Promise<SubscriptionPlan | null> {
    const subscription = await this.findByUserId(userId);
    return subscription ? subscription.plan : null;
  }
}
