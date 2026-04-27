import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../schemas/subscription.schema';

const mockSubscriptionModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  save: jest.fn(),
};

function createMockConstructor(saveResult: any) {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(saveResult),
  }));
}

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enforceClinicProfessionalLimit', () => {
    const clinicId = '507f1f77bcf86cd799439011';

    it('should throw ForbiddenException when no subscription and currentCount equals FREE limit (2)', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue(null);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass when no subscription and currentCount is below FREE limit (1)', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue(null);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 1),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException for FREE plan when currentCount equals limit (2)', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass for FREE plan when currentCount is below limit (1)', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 1),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException for BASIC plan when currentCount equals limit (10)', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 10),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass for BASIC plan when currentCount is below limit (9)', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 9),
      ).resolves.toBeUndefined();
    });

    it('should pass for PRO plan regardless of currentCount (unlimited)', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 9999),
      ).resolves.toBeUndefined();
    });

    it('should fall back to FREE and pass when legacy plan value "professional" and currentCount is 0', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: 'professional',
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 0),
      ).resolves.toBeUndefined();
    });

    it('should fall back to FREE and throw ForbiddenException when legacy plan value "professional" and currentCount is 5', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: 'professional',
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 5),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include plan name and limit in the ForbiddenException message', async () => {
      jest.spyOn(service, 'findByOwner').mockResolvedValue({
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.enforceClinicProfessionalLimit(clinicId, 2),
      ).rejects.toThrow(
        `Professional limit reached for current subscription plan (free). Limit: 2.`,
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when subscription is not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockSubscriptionModel.findById.mockReturnValue({ exec: execMock });

      await expect(
        service.findById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when subscription to update is not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({ exec: execMock });

      await expect(
        service.update('507f1f77bcf86cd799439011', { plan: SubscriptionPlan.BASIC }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when subscription to remove is not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockSubscriptionModel.findByIdAndDelete.mockReturnValue({ exec: execMock });

      await expect(
        service.remove('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
