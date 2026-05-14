import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../constants/subscription.constants';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Subscription } from '../schemas/subscription.schema';
import { SubscriptionsService } from '../subscriptions.service';

const mockClinicId = new Types.ObjectId().toHexString();
const mockSubscriptionId = new Types.ObjectId().toHexString();

const mockSubscriptionDoc = {
  _id: mockSubscriptionId,
  clinicId: mockClinicId,
  plan: SubscriptionPlan.FREE,
  status: SubscriptionStatus.TRIAL,
  expiresAt: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSave = jest.fn();

const mockSubscriptionModel = {
  save: mockSave,
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

function createModelMock() {
  const constructor = jest.fn().mockImplementation(() => ({
    save: mockSave,
  }));
  Object.assign(constructor, mockSubscriptionModel);
  return constructor;
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let model: ReturnType<typeof createModelMock>;

  beforeEach(async () => {
    model = createModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: model,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);

    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should persist a subscription with provided clinicId and default status TRIAL', async () => {
      const dto: CreateSubscriptionDto = {
        clinicId: mockClinicId,
        plan: SubscriptionPlan.FREE,
      };

      mockSave.mockResolvedValueOnce({
        ...mockSubscriptionDoc,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.TRIAL,
      });

      const result = await service.create(dto);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result.plan).toBe(SubscriptionPlan.FREE);
      expect(result.status).toBe(SubscriptionStatus.TRIAL);
      expect(result.clinicId).toBe(mockClinicId);
    });

    it('should throw ConflictException on duplicate clinicId (mongo error code 11000)', async () => {
      const dto: CreateSubscriptionDto = {
        clinicId: mockClinicId,
        plan: SubscriptionPlan.FREE,
      };

      const mongoError = { code: 11000 };
      mockSave.mockRejectedValueOnce(mongoError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByClinicId()', () => {
    it('should return the subscription document when found', async () => {
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockSubscriptionDoc),
      });

      const result = await service.findByClinicId(mockClinicId);

      expect(model.findOne).toHaveBeenCalledWith({ clinicId: mockClinicId });
      expect(result).toEqual(mockSubscriptionDoc);
    });

    it('should return null when no subscription found for clinicId', async () => {
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      const result = await service.findByClinicId(mockClinicId);

      expect(result).toBeNull();
    });
  });

  describe('findById()', () => {
    it('should throw NotFoundException when subscription does not exist', async () => {
      model.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(service.findById(mockSubscriptionId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the subscription when found', async () => {
      model.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockSubscriptionDoc),
      });

      const result = await service.findById(mockSubscriptionId);

      expect(result).toEqual(mockSubscriptionDoc);
    });
  });

  describe('update()', () => {
    it('should update only the allowed fields', async () => {
      const dto: UpdateSubscriptionDto = {
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      };

      const updatedDoc = {
        ...mockSubscriptionDoc,
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      };

      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(updatedDoc),
      });

      const result = await service.update(mockSubscriptionId, dto);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscriptionId,
        {
          $set: {
            plan: SubscriptionPlan.BASIC,
            status: SubscriptionStatus.ACTIVE,
          },
        },
        { new: true },
      );
      expect(result.plan).toBe(SubscriptionPlan.BASIC);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should throw NotFoundException when subscription to update does not exist', async () => {
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(
        service.update(mockSubscriptionId, { plan: SubscriptionPlan.PRO }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel()', () => {
    it('should set status to INACTIVE and return the document', async () => {
      const cancelledDoc = {
        ...mockSubscriptionDoc,
        status: SubscriptionStatus.INACTIVE,
      };

      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(cancelledDoc),
      });

      const result = await service.cancel(mockSubscriptionId);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscriptionId,
        { $set: { status: SubscriptionStatus.INACTIVE } },
        { new: true },
      );
      expect(result.status).toBe(SubscriptionStatus.INACTIVE);
    });

    it('should throw NotFoundException when subscription to cancel does not exist', async () => {
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(service.cancel(mockSubscriptionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('enforceClinicProfessionalLimit()', () => {
    it('7a: no subscription found → treated as FREE → throws ForbiddenException when currentCount = 2', async () => {
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('7b: no subscription found → treated as FREE → resolves when currentCount = 1', async () => {
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 1),
      ).resolves.toBeUndefined();
    });

    it('7c: BASIC plan + currentCount = 9 → resolves', async () => {
      const basicSub = { ...mockSubscriptionDoc, plan: SubscriptionPlan.BASIC };
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(basicSub),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 9),
      ).resolves.toBeUndefined();
    });

    it('7d: BASIC plan + currentCount = 10 → throws ForbiddenException', async () => {
      const basicSub = { ...mockSubscriptionDoc, plan: SubscriptionPlan.BASIC };
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(basicSub),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 10),
      ).rejects.toThrow(ForbiddenException);
    });

    it('7e: PRO plan + currentCount = 9999 → resolves (unlimited)', async () => {
      const proSub = { ...mockSubscriptionDoc, plan: SubscriptionPlan.PRO };
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(proSub),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 9999),
      ).resolves.toBeUndefined();
    });
  });
});
