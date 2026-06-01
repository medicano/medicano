import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription } from '../schemas/subscription.schema';
import { Clinic } from '../../clinics/schemas/clinic.schema';
import { SubscriptionPlan } from '@medicano/types';
import { PLAN_PROFESSIONAL_LIMITS } from '../constants/subscription.constants';

const mockSubscriptionModel = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  constructor: jest.fn(),
};

const mockClinicModel = {
  findOne: jest.fn(),
};

const buildExecChain = (resolved: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolved),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
});

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
        {
          provide: getModelToken(Clinic.name),
          useValue: mockClinicModel,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enforceClinicProfessionalLimit', () => {
    const clinicId = 'clinic-1';

    it('treats clinic without active subscription as FREE — throws when currentCount >= FREE limit', async () => {
      mockSubscriptionModel.findOne.mockReturnValue(
        buildExecChain(null),
      );

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE]),
      ).rejects.toThrow();
    });

    it('allows under FREE limit when no active subscription exists', async () => {
      mockSubscriptionModel.findOne.mockReturnValue(
        buildExecChain(null),
      );

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE] - 1),
      ).resolves.not.toThrow();
    });

    it('allows unlimited when plan is PRO (currentCount = 9999)', async () => {
      mockSubscriptionModel.findOne.mockReturnValue(
        buildExecChain({
          clinicId,
          plan: SubscriptionPlan.PRO,
          status: 'active',
        }),
      );

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 9999),
      ).resolves.not.toThrow();
    });

    it('blocks when BASIC plan and currentCount >= BASIC limit (10)', async () => {
      mockSubscriptionModel.findOne.mockReturnValue(
        buildExecChain({
          clinicId,
          plan: SubscriptionPlan.BASIC,
          status: 'active',
        }),
      );

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.BASIC]),
      ).rejects.toThrow();
    });

    it('allows when BASIC plan and currentCount < BASIC limit (9 < 10)', async () => {
      mockSubscriptionModel.findOne.mockReturnValue(
        buildExecChain({
          clinicId,
          plan: SubscriptionPlan.BASIC,
          status: 'active',
        }),
      );

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.BASIC] - 1),
      ).resolves.not.toThrow();
    });

    it('looks up subscription by clinicId (not userId) with status active or trial', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockSubscriptionModel.findOne.mockReturnValue({ exec: execMock });

      try {
        await service.enforceClinicProfessionalLimit(clinicId, 0);
      } catch {
        // ignore thrown exception — we only care about the call assertion
      }

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId, status: { $in: ['active', 'trial'] } }),
      );
    });

    it('grants the plan limit during a trial of a paid plan', async () => {
      mockSubscriptionModel.findOne.mockReturnValue(
        buildExecChain({ clinicId, plan: SubscriptionPlan.BASIC, status: 'trial' }),
      );

      // a BASIC trial must allow up to the BASIC limit, not the FREE one
      await expect(
        service.enforceClinicProfessionalLimit(clinicId, PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE]),
      ).resolves.not.toThrow();
    });
  });

  describe('getSubscriptionByClinicId', () => {
    it('returns subscription for a given clinicId', async () => {
      const fixture = {
        _id: 'sub-1',
        clinicId: 'clinic-1',
        plan: SubscriptionPlan.BASIC,
        status: 'active',
        startedAt: new Date(),
      };

      mockSubscriptionModel.findOne.mockReturnValue(buildExecChain(fixture));

      const result = await service.getSubscriptionByClinicId('clinic-1');

      expect(result).toEqual(fixture);
      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId: 'clinic-1' }),
      );
    });

    it('returns null when no subscription found', async () => {
      mockSubscriptionModel.findOne.mockReturnValue(buildExecChain(null));

      const result = await service.getSubscriptionByClinicId('clinic-xyz');

      expect(result).toBeNull();
    });
  });

  describe('createSubscription', () => {
    it('creates a subscription with clinicId and plan', async () => {
      const dto = {
        clinicId: '507f1f77bcf86cd799439011',
        plan: SubscriptionPlan.FREE,
      };

      const created = {
        _id: 'sub-new',
        ...dto,
        status: 'active',
        startedAt: new Date(),
      };

      mockSubscriptionModel.create.mockResolvedValue(created);

      const result = await service.createSubscription(dto as any);

      expect(result).toMatchObject({
        clinicId: dto.clinicId,
        plan: dto.plan,
      });
    });
  });

  describe('updateSubscription', () => {
    it('updates plan for existing subscription', async () => {
      const updated = {
        _id: 'sub-1',
        clinicId: 'clinic-1',
        plan: SubscriptionPlan.PRO,
        status: 'active',
        startedAt: new Date(),
      };

      mockSubscriptionModel.findOneAndUpdate.mockReturnValue(
        buildExecChain(updated),
      );

      const result = await service.updateSubscription('sub-1', { plan: SubscriptionPlan.PRO } as any);

      expect(result).toMatchObject({ plan: SubscriptionPlan.PRO });
    });
  });

  describe('cancelSubscription', () => {
    it('sets status to cancelled', async () => {
      const cancelled = {
        _id: 'sub-1',
        clinicId: 'clinic-1',
        plan: SubscriptionPlan.BASIC,
        status: 'cancelled',
        startedAt: new Date(),
      };

      mockSubscriptionModel.findOneAndUpdate.mockReturnValue(
        buildExecChain(cancelled),
      );

      const result = await service.cancelSubscription('sub-1');

      expect(result).toMatchObject({ status: 'cancelled' });
    });
  });
});
