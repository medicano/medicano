import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { AttendantsService } from '../services/attendants.service';
import { ClinicsService } from '../clinics.service';
import { Professional } from '../../professionals/schemas/professional.schema';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { ActivityAction } from '../../activity-log/enums/activity-action.enum';
import { AttendantPermission } from '../../common/enums/attendant-permission.enum';
import { SubscriptionPlan } from '../../subscriptions/constants/subscription.constants';

describe('AttendantsService', () => {
  let service: AttendantsService;
  let userModel: any;
  let professionalModel: any;
  let clinicsService: any;
  let subscriptionsService: any;
  let activityLogService: any;

  const clinicId = new Types.ObjectId().toHexString();
  const clinicOwnerId = new Types.ObjectId().toHexString();
  const professionalId = new Types.ObjectId().toHexString();
  const professionalOwnerId = new Types.ObjectId().toHexString();

  beforeEach(async () => {
    userModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
    };
    professionalModel = {
      findById: jest.fn(),
    };
    clinicsService = {
      findById: jest.fn(),
    };
    subscriptionsService = {
      ensureForClinic: jest.fn(),
    };
    activityLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendantsService,
        { provide: getModelToken('User'), useValue: userModel },
        { provide: getModelToken(Professional.name), useValue: professionalModel },
        { provide: ClinicsService, useValue: clinicsService },
        { provide: SubscriptionsService, useValue: subscriptionsService },
        { provide: ActivityLogService, useValue: activityLogService },
      ],
    }).compile();

    service = module.get<AttendantsService>(AttendantsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createAttendant', () => {
    const dto = { username: 'joana', password: 'senha12345', displayName: 'Joana' };

    beforeEach(() => {
      clinicsService.findById.mockResolvedValue({ userId: new Types.ObjectId(clinicOwnerId) });
      subscriptionsService.ensureForClinic.mockResolvedValue({ plan: SubscriptionPlan.PRO });
      userModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ displayName: 'Dono da Clínica' }),
      });
    });

    it('applies the default permission set when none is provided', async () => {
      userModel.create.mockResolvedValue({
        toObject: () => ({ displayName: 'Joana', permissions: [AttendantPermission.VIEW_AGENDA, AttendantPermission.MANAGE_APPOINTMENTS] }),
      });

      await service.createAttendant(clinicId, clinicOwnerId, dto as any);

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: [AttendantPermission.VIEW_AGENDA, AttendantPermission.MANAGE_APPOINTMENTS],
        }),
      );
    });

    it('uses the permissions provided in the DTO instead of the default', async () => {
      userModel.create.mockResolvedValue({
        toObject: () => ({ displayName: 'Joana', permissions: [AttendantPermission.VIEW_REPORTS] }),
      });

      await service.createAttendant(clinicId, clinicOwnerId, {
        ...dto,
        permissions: [AttendantPermission.VIEW_REPORTS],
      } as any);

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: [AttendantPermission.VIEW_REPORTS] }),
      );
    });

    it('records an activity log entry on success', async () => {
      userModel.create.mockResolvedValue({
        toObject: () => ({ displayName: 'Joana', permissions: [] }),
      });

      await service.createAttendant(clinicId, clinicOwnerId, dto as any);

      expect(activityLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId,
          actorUserId: clinicOwnerId,
          action: ActivityAction.ATTENDANT_CREATED,
        }),
      );
    });

    it('throws ForbiddenException when the caller does not own the clinic', async () => {
      clinicsService.findById.mockResolvedValue({ userId: new Types.ObjectId() });

      await expect(service.createAttendant(clinicId, clinicOwnerId, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the clinic does not exist', async () => {
      clinicsService.findById.mockResolvedValue(null);

      await expect(service.createAttendant(clinicId, clinicOwnerId, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAttendant', () => {
    it('updates permissions and records the activity log', async () => {
      clinicsService.findById.mockResolvedValue({ userId: new Types.ObjectId(clinicOwnerId) });
      userModel.findOneAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ displayName: 'Joana', permissions: [AttendantPermission.VIEW_REPORTS] }),
      });
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ displayName: 'Dono da Clínica' }),
      });

      const attendantId = new Types.ObjectId().toHexString();
      await service.updateAttendant(clinicId, attendantId, clinicOwnerId, {
        permissions: [AttendantPermission.VIEW_REPORTS],
      });

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: attendantId }),
        expect.objectContaining({ permissions: [AttendantPermission.VIEW_REPORTS] }),
        { new: true },
      );
      expect(activityLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: ActivityAction.ATTENDANT_UPDATED }),
      );
    });
  });

  describe('removeAttendant', () => {
    it('records the activity log after removal', async () => {
      clinicsService.findById.mockResolvedValue({ userId: new Types.ObjectId(clinicOwnerId) });
      userModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) });
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ displayName: 'Dono da Clínica' }),
      });

      const attendantId = new Types.ObjectId().toHexString();
      const result = await service.removeAttendant(clinicId, attendantId, clinicOwnerId);

      expect(result).toEqual({ success: true });
      expect(activityLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: ActivityAction.ATTENDANT_REMOVED }),
      );
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      clinicsService.findById.mockResolvedValue({ userId: new Types.ObjectId(clinicOwnerId) });
      userModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) });

      await expect(
        service.removeAttendant(clinicId, new Types.ObjectId().toHexString(), clinicOwnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createForProfessional', () => {
    it('applies the default permission set and records the activity log against the professional owner', async () => {
      professionalModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue({ userId: new Types.ObjectId(professionalOwnerId) }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue({ plan: 'free' }),
        });
      userModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      userModel.create.mockResolvedValue({
        toObject: () => ({ displayName: 'Joana', permissions: [] }),
      });
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ displayName: 'Profissional' }),
      });

      await service.createForProfessional(professionalId, professionalOwnerId, {
        username: 'joana',
        password: 'senha12345',
        displayName: 'Joana',
      } as any);

      expect(activityLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ professionalId, action: ActivityAction.ATTENDANT_CREATED }),
      );
    });
  });
});
