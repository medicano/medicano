import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { ActivityLogService } from '../activity-log.service';
import { ActivityLog } from '../schemas/activity-log.schema';
import { ActivityAction } from '../enums/activity-action.enum';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let activityLogModel: any;

  beforeEach(async () => {
    activityLogModel = {
      create: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        { provide: getModelToken(ActivityLog.name), useValue: activityLogModel },
      ],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('record', () => {
    it('persists the log entry with the given fields', async () => {
      activityLogModel.create.mockResolvedValue({});

      await service.record({
        clinicId: new Types.ObjectId().toHexString(),
        actorUserId: new Types.ObjectId().toHexString(),
        actorDisplayName: 'Dono da Clínica',
        action: ActivityAction.ATTENDANT_CREATED,
        description: 'criou um atendente',
      });

      expect(activityLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: ActivityAction.ATTENDANT_CREATED }),
      );
    });

    it('never throws, even when persistence fails', async () => {
      activityLogModel.create.mockRejectedValue(new Error('mongo down'));

      await expect(
        service.record({
          actorUserId: new Types.ObjectId().toHexString(),
          actorDisplayName: 'X',
          action: ActivityAction.ATTENDANT_REMOVED,
          description: 'removeu um atendente',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('listByClinic', () => {
    it('returns the most recent entries for the clinic, limited', async () => {
      const clinicId = new Types.ObjectId().toHexString();
      const execMock = jest.fn().mockResolvedValue([{ description: 'a' }]);
      const limitMock = jest.fn().mockReturnValue({ exec: execMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      activityLogModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.listByClinic(clinicId, 10);

      expect(activityLogModel.find).toHaveBeenCalledWith({ clinicId });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(result).toEqual([{ description: 'a' }]);
    });

    it('returns an empty array for an invalid clinic id, without querying the database', async () => {
      const result = await service.listByClinic('not-an-id');

      expect(result).toEqual([]);
      expect(activityLogModel.find).not.toHaveBeenCalled();
    });
  });
});
