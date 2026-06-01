import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { PatientProfileService } from '../patient-profile.service';
import { PatientProfile } from '../schemas/patient-profile.schema';
import { BiologicalSex, SmokingStatus } from '@medicano/types';

type MockModel = {
  findOne: jest.Mock;
  updateOne: jest.Mock;
  deleteOne: jest.Mock;
};

const createMockModel = (): MockModel => {
  const exec = jest.fn();
  const findOne = jest.fn(() => ({ exec }));
  const updateOne = jest.fn(() => ({
    exec: jest.fn().mockResolvedValue({ acknowledged: true }),
  }));
  const deleteOne = jest.fn(() => ({ exec: jest.fn() }));
  return { findOne, updateOne, deleteOne } as unknown as MockModel;
};

const USER_ID = '507f1f77bcf86cd799439011';

const baseProfile: Partial<PatientProfile> = {
  userId: USER_ID,
  useInTriage: true,
  birthDate: new Date('1990-06-15'),
  biologicalSex: BiologicalSex.FEMALE,
  weightKg: 70,
  heightCm: 170,
  smokingStatus: SmokingStatus.CURRENT,
  medications: [{ name: 'Losartana', dose: '50mg' }],
  allergies: [{ substance: 'Dipirona', reaction: 'urticária' }],
  observations: 'Histórico familiar de hipertensão',
};

describe('PatientProfileService', () => {
  let service: PatientProfileService;
  let model: MockModel;

  beforeEach(async () => {
    model = createMockModel();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PatientProfileService,
        { provide: getModelToken(PatientProfile.name), useValue: model },
      ],
    }).compile();
    service = moduleRef.get(PatientProfileService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByUserId', () => {
    it('BR-PP-01: queries Mongo by userId field exactly once', async () => {
      const execMock = jest.fn().mockResolvedValue(baseProfile);
      model.findOne.mockReturnValue({ exec: execMock });

      await service.findByUserId(USER_ID);

      expect(model.findOne).toHaveBeenCalledTimes(1);
      expect(model.findOne).toHaveBeenCalledWith({ userId: USER_ID });
    });

    it('BR-PP-02: returns null when no document exists', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      model.findOne.mockReturnValue({ exec: execMock });

      const result = await service.findByUserId(USER_ID);

      expect(result).toBeNull();
    });
  });

  describe('upsertForUser', () => {
    it('BR-PP-03: uses { upsert: true } and $setOnInsert: { userId } to prevent userId mutation', async () => {
      const execMock = jest.fn().mockResolvedValue({ acknowledged: true });
      model.updateOne.mockReturnValue({ exec: execMock });

      const dto = { weightKg: 72 };
      await service.upsertForUser(USER_ID, dto);

      expect(model.updateOne).toHaveBeenCalledTimes(1);
      const [filter, update, options] = model.updateOne.mock.calls[0];

      expect(filter).toEqual({ userId: USER_ID });
      expect(options).toEqual(expect.objectContaining({ upsert: true }));
      expect(update).toEqual(
        expect.objectContaining({
          $setOnInsert: expect.objectContaining({ userId: USER_ID }),
        }),
      );
    });

    it('BR-PP-04: always refreshes lastReviewedAt on every write (LGPD audit trail)', async () => {
      const execMock = jest.fn().mockResolvedValue({ acknowledged: true });
      model.updateOne.mockReturnValue({ exec: execMock });

      const dto = { weightKg: 72 };
      await service.upsertForUser(USER_ID, dto);

      const [, update] = model.updateOne.mock.calls[0];
      expect(update).toEqual(
        expect.objectContaining({
          $set: expect.objectContaining({
            lastReviewedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('exportForUser', () => {
    it('BR-PP-05: wraps profile in { profile, exportedAt: Date } with a fresh Date instance', async () => {
      const execMock = jest.fn().mockResolvedValue(baseProfile);
      model.findOne.mockReturnValue({ exec: execMock });

      const before = new Date();
      const result = await service.exportForUser(USER_ID);
      const after = new Date();

      expect(result).toHaveProperty('profile', baseProfile);
      expect(result).toHaveProperty('exportedAt');
      expect(result.exportedAt).toBeInstanceOf(Date);
      expect(result.exportedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.exportedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('hardDeleteForUser', () => {
    it('BR-PP-06: returns { deleted: true } when deletedCount > 0', async () => {
      const execMock = jest.fn().mockResolvedValue({ deletedCount: 1 });
      model.deleteOne.mockReturnValue({ exec: execMock });

      const result = await service.hardDeleteForUser(USER_ID);

      expect(result).toEqual({ deleted: true });
    });

    it('BR-PP-07: returns { deleted: false } when deletedCount === 0', async () => {
      const execMock = jest.fn().mockResolvedValue({ deletedCount: 0 });
      model.deleteOne.mockReturnValue({ exec: execMock });

      const result = await service.hardDeleteForUser(USER_ID);

      expect(result).toEqual({ deleted: false });
    });
  });

  describe('setUseInTriage', () => {
    it('BR-PP-08: forwards the boolean exactly as received', async () => {
      const execMock = jest.fn().mockResolvedValue({ acknowledged: true });
      model.updateOne.mockReturnValue({ exec: execMock });

      await service.setUseInTriage(USER_ID, false);

      const [filter, update] = model.updateOne.mock.calls[0];
      expect(filter).toEqual({ userId: USER_ID });
      expect(update).toEqual(
        expect.objectContaining({
          $set: expect.objectContaining({ useInTriage: false }),
        }),
      );
    });
  });

  describe('BR-PP-09: logger must never receive clinical field content', () => {
    it('does not log medication names, observation text, or allergy substances', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

      const execMock = jest.fn().mockResolvedValue(baseProfile);
      model.findOne.mockReturnValue({ exec: execMock });
      model.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ acknowledged: true }),
      });
      model.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const dto = { ...baseProfile };
      await service.findByUserId(USER_ID);
      await service.upsertForUser(USER_ID, dto);
      await service.hardDeleteForUser(USER_ID);

      const sensitiveValues = [
        'Losartana',
        'Dipirona',
        'urticária',
        'Histórico familiar de hipertensão',
      ];

      const allLogArgs = [
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...debugSpy.mock.calls,
      ]
        .flat()
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)));

      for (const sensitive of sensitiveValues) {
        for (const loggedArg of allLogArgs) {
          expect(loggedArg).not.toContain(sensitive);
        }
      }

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      debugSpy.mockRestore();
    });
  });
});
