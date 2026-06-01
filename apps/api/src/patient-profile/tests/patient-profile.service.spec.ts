import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PatientProfileService } from '../patient-profile.service';
import { PatientProfile } from '../schemas/patient-profile.schema';
import { UpdatePatientProfileDto } from '../dto/update-patient-profile.dto';

const mockProfile = {
  userId: 'user-123',
  useInTriage: true,
  medications: [],
  allergies: [],
  chronicConditions: [],
  familyHistory: [],
  dietaryRestrictions: [],
  lastReviewedAt: new Date(),
};

const mockUpdateOne = jest.fn();
const mockDeleteOne = jest.fn();
const mockFindOne = jest.fn();

const mockPatientProfileModel = {
  findOne: mockFindOne,
  updateOne: mockUpdateOne,
  deleteOne: mockDeleteOne,
};

describe('PatientProfileService', () => {
  let patientProfileService: PatientProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientProfileService,
        {
          provide: getModelToken(PatientProfile.name),
          useValue: mockPatientProfileModel,
        },
      ],
    }).compile();

    patientProfileService = module.get<PatientProfileService>(PatientProfileService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByUserId', () => {
    it('should return the profile when found', async () => {
      mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockProfile) });

      const result = await patientProfileService.findByUserId('user-123');

      expect(result).toEqual(mockProfile);
      expect(mockFindOne).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('should return null when profile is not found', async () => {
      mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await patientProfileService.findByUserId('user-123');

      expect(result).toBeNull();
    });
  });

  describe('upsertForUser', () => {
    it('should upsert the profile and return it', async () => {
      const dto: UpdatePatientProfileDto = { smokingStatus: 'never' } as UpdatePatientProfileDto;
      mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProfile, smokingStatus: 'never' }),
      });

      const result = await patientProfileService.upsertForUser('user-123', dto);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { userId: 'user-123' },
        expect.objectContaining({
          $set: expect.objectContaining({ smokingStatus: 'never' }),
          $setOnInsert: { userId: 'user-123' },
        }),
        { upsert: true },
      );
      expect(result).toMatchObject({ smokingStatus: 'never' });
    });

    it('should rethrow errors from the model', async () => {
      const dto: UpdatePatientProfileDto = {} as UpdatePatientProfileDto;
      mockUpdateOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await expect(patientProfileService.upsertForUser('user-123', dto)).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('exportForUser', () => {
    it('should return profile and exportedAt timestamp', async () => {
      mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockProfile) });

      const result = await patientProfileService.exportForUser('user-123');

      expect(result.profile).toEqual(mockProfile);
      expect(result.exportedAt).toBeInstanceOf(Date);
    });

    it('should return null profile when not found', async () => {
      mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await patientProfileService.exportForUser('user-123');

      expect(result.profile).toBeNull();
      expect(result.exportedAt).toBeInstanceOf(Date);
    });
  });

  describe('hardDeleteForUser', () => {
    it('should return deleted true when document existed', async () => {
      mockDeleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) });

      const result = await patientProfileService.hardDeleteForUser('user-123');

      expect(result).toEqual({ deleted: true });
      expect(mockDeleteOne).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('should return deleted false when document did not exist', async () => {
      mockDeleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) });

      const result = await patientProfileService.hardDeleteForUser('user-123');

      expect(result).toEqual({ deleted: false });
    });
  });

  describe('setUseInTriage', () => {
    it('should update useInTriage and return the updated profile', async () => {
      mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProfile, useInTriage: false }),
      });

      const result = await patientProfileService.setUseInTriage('user-123', false);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { userId: 'user-123' },
        { $set: { useInTriage: false } },
      );
      expect(result).toMatchObject({ useInTriage: false });
    });

    it('should return null when profile does not exist', async () => {
      mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await patientProfileService.setUseInTriage('user-123', true);

      expect(result).toBeNull();
    });
  });
});
