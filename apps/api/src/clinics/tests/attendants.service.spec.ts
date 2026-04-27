import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AttendantsService } from '../services/attendants.service';
import { User } from '../../auth/schemas/user.schema';
import { Clinic } from '../schemas/clinic.schema';

const mockUserModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
};

const mockClinicModel = {
  findById: jest.fn(),
};

const mockSubscriptionsService = {
  enforceClinicProfessionalLimit: jest.fn(),
};

describe('AttendantsService', () => {
  let service: AttendantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendantsService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Clinic.name),
          useValue: mockClinicModel,
        },
        {
          provide: 'SubscriptionsService',
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    service = module.get<AttendantsService>(AttendantsService);
    jest.clearAllMocks();
  });

  describe('createAttendant', () => {
    it('throws NotFoundException when clinic not found', async () => {
      mockClinicModel.findById.mockResolvedValue(null);

      await expect(
        service.createAttendant('owner-1', {
          email: 'att@test.com',
          password: 'Secret123!',
          displayName: 'Atendente',
          clinicId: 'clinic-1',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when not clinic owner', async () => {
      mockClinicModel.findById.mockResolvedValue({
        _id: 'clinic-1',
        ownerId: 'other-owner',
      });

      await expect(
        service.createAttendant('owner-1', {
          email: 'att@test.com',
          password: 'Secret123!',
          displayName: 'Atendente',
          clinicId: 'clinic-1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when email already exists', async () => {
      mockClinicModel.findById.mockResolvedValue({
        _id: 'clinic-1',
        ownerId: 'owner-1',
      });
      mockUserModel.findOne.mockResolvedValue({ email: 'att@test.com' });

      await expect(
        service.createAttendant('owner-1', {
          email: 'att@test.com',
          password: 'Secret123!',
          displayName: 'Atendente',
          clinicId: 'clinic-1',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('persists displayName and isActive=true', async () => {
      mockClinicModel.findById.mockResolvedValue({
        _id: 'clinic-1',
        ownerId: 'owner-1',
      });
      mockUserModel.findOne.mockResolvedValue(null);

      const dto = {
        email: 'att@test.com',
        password: 'Secret123!',
        displayName: 'Atendente Maria',
        clinicId: 'clinic-1',
      };
      mockUserModel.create.mockResolvedValue({ _id: 'user-1', ...dto });

      await service.createAttendant('owner-1', dto as any);

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'Atendente Maria',
          isActive: true,
        }),
      );
    });
  });

  describe('listAttendants', () => {
    it('returns attendants for clinic', async () => {
      mockClinicModel.findById.mockResolvedValue({
        _id: 'clinic-1',
        ownerId: 'owner-1',
      });
      mockUserModel.find.mockResolvedValue([
        { _id: 'user-1', email: 'att@test.com', displayName: 'Atendente' },
      ]);

      const result = await service.listAttendants('owner-1', 'clinic-1');
      expect(result).toHaveLength(1);
    });
  });
});
