import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription } from '../schemas/subscription.schema';
import { SubscriptionPlan } from '../constants/subscription.constants';

const mockSubscriptionModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
  });

  describe('findByOwner', () => {
    it('returns subscription when found', async () => {
      const sub = { plan: SubscriptionPlan.BASIC, ownerId: 'owner-1' };
      mockSubscriptionModel.findOne.mockResolvedValue(sub);

      const result = await service.findByOwner('owner-1');
      expect(result).toEqual(sub);
      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({ ownerId: 'owner-1' });
    });

    it('returns null when not found', async () => {
      mockSubscriptionModel.findOne.mockResolvedValue(null);

      const result = await service.findByOwner('owner-1');
      expect(result).toBeNull();
    });
  });

  describe('enforceClinicProfessionalLimit', () => {
    it('FREE plan allows up to 1 professional', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue(null);

      await expect(
        service.enforceClinicProfessionalLimit('owner-1', 1),
      ).resolves.not.toThrow();
    });

    it('FREE plan blocks at 2 professionals', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue(null);

      await expect(
        service.enforceClinicProfessionalLimit('owner-1', 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('BASIC plan allows up to 5 professionals', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.BASIC,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit('owner-1', 5),
      ).resolves.not.toThrow();
    });

    it('BASIC plan blocks at 6 professionals', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.BASIC,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit('owner-1', 6),
      ).rejects.toThrow(ForbiddenException);
    });

    it('PRO plan never blocks', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.PRO,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit('owner-1', 999),
      ).resolves.not.toThrow();
    });

    it('no subscription defaults to FREE limits (2)', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue(null);
      await expect(service.enforceClinicProfessionalLimit('owner-1', 2))
        .rejects.toThrow(ForbiddenException);

      jest.spyOn(service, 'findByOwner').mockResolvedValue(null);
      await expect(service.enforceClinicProfessionalLimit('owner-1', 1))
        .resolves.not.toThrow();
    });
  });

  describe('createOrUpdate', () => {
    it('creates subscription with BASIC plan', async () => {
      const sub = { ownerId: 'owner-1', plan: SubscriptionPlan.BASIC };
      mockSubscriptionModel.findOneAndUpdate.mockResolvedValue(sub);

      const result = await service.createOrUpdate('owner-1', SubscriptionPlan.BASIC);
      expect(result).toEqual(sub);
    });

    it('creates subscription with PRO plan', async () => {
      const sub = { ownerId: 'owner-1', plan: SubscriptionPlan.PRO };
      mockSubscriptionModel.findOneAndUpdate.mockResolvedValue(sub);

      const result = await service.createOrUpdate('owner-1', SubscriptionPlan.PRO);
      expect(result).toEqual(sub);
    });
  });
});
