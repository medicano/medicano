import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription } from '../schemas/subscription.schema';
import { SubscriptionPlan, SUBSCRIPTION_PLAN_LIMITS } from '../constants/subscription.constants';
import { Types } from 'mongoose';

const mockUserId = new Types.ObjectId().toHexString();

const mockBasicSubscription = {
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId(mockUserId),
  plan: SubscriptionPlan.BASIC,
  clinicLimit: SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.BASIC].clinicLimit,
  appointmentLimit: SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.BASIC].appointmentLimit,
  aiTriageEnabled: SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.BASIC].aiTriageEnabled,
  prioritySupport: SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.BASIC].prioritySupport,
  isActive: true,
  save: jest.fn().mockResolvedValue(this),
};

const mockPremiumSubscription = {
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId(mockUserId),
  plan: SubscriptionPlan.PREMIUM,
  clinicLimit: SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.PREMIUM].clinicLimit,
  appointmentLimit: SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.PREMIUM].appointmentLimit,
  aiTriageEnabled: SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.PREMIUM].aiTriageEnabled,
  prioritySupport: SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.PREMIUM].prioritySupport,
  isActive: true,
  save: jest.fn().mockResolvedValue(this),
};

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockModel: any;

  beforeEach(async () => {
    const mockSave = jest.fn().mockResolvedValue(mockBasicSubscription);
    mockModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      new: jest.fn(),
      constructor: jest.fn(),
      create: jest.fn(),
      save: mockSave,
    };

    const mockModelConstructor = jest.fn().mockImplementation(() => ({
      ...mockBasicSubscription,
      save: mockSave,
    }));
    Object.assign(mockModelConstructor, mockModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockModelConstructor,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a BASIC subscription successfully', async () => {
      mockModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.create(mockUserId, { plan: SubscriptionPlan.BASIC });

      expect(result).toBeDefined();
      expect(result.plan).toBe(SubscriptionPlan.BASIC);
      expect(result.clinicLimit).toBe(SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.BASIC].clinicLimit);
    });

    it('should create a PREMIUM subscription successfully', async () => {
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const premiumSave = jest.fn().mockResolvedValue(mockPremiumSubscription);
      (service as any).subscriptionModel = jest.fn().mockImplementation(() => ({
        ...mockPremiumSubscription,
        save: premiumSave,
      }));
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.create(mockUserId, { plan: SubscriptionPlan.PREMIUM });

      expect(result).toBeDefined();
      expect(result.plan).toBe(SubscriptionPlan.PREMIUM);
      expect(result.clinicLimit).toBe(SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.PREMIUM].clinicLimit);
    });

    it('should throw BadRequestException if active subscription exists', async () => {
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBasicSubscription),
      });

      await expect(
        service.create(mockUserId, { plan: SubscriptionPlan.BASIC }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByUserId', () => {
    it('should return active subscription for user', async () => {
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBasicSubscription),
      });

      const result = await service.findByUserId(mockUserId);

      expect(result).toEqual(mockBasicSubscription);
    });

    it('should return null if no active subscription', async () => {
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByUserId(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return subscription by id', async () => {
      const id = new Types.ObjectId().toHexString();
      (service as any).subscriptionModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBasicSubscription),
      });

      const result = await service.findById(id);

      expect(result).toEqual(mockBasicSubscription);
    });

    it('should throw NotFoundException if not found', async () => {
      (service as any).subscriptionModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasReachedClinicLimit', () => {
    it('should return false when under clinic limit', async () => {
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockBasicSubscription,
          clinicLimit: 1,
        }),
      });

      const result = await service.hasReachedClinicLimit(mockUserId, 0);

      expect(result).toBe(false);
    });

    it('should return true when at clinic limit', async () => {
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockBasicSubscription,
          clinicLimit: 1,
        }),
      });

      const result = await service.hasReachedClinicLimit(mockUserId, 1);

      expect(result).toBe(true);
    });

    it('should return true if no subscription found', async () => {
      (service as any).subscriptionModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.hasReachedClinicLimit(mockUserId, 0);

      expect(result).toBe(true);
    });
  });

  describe('plan limits', () => {
    it('BASIC plan should have clinicLimit of 1', () => {
      expect(SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.BASIC].clinicLimit).toBe(1);
    });

    it('PREMIUM plan should have clinicLimit of 10', () => {
      expect(SUBSCRIPTION_PLAN_LIMITS[SubscriptionPlan.PREMIUM].clinicLimit).toBe(10);
    });

    it('should not have PROFESSIONAL or ENTERPRISE plans', () => {
      const plans = Object.values(SubscriptionPlan);
      expect(plans).not.toContain('PROFESSIONAL');
      expect(plans).not.toContain('ENTERPRISE');
    });
  });
});
