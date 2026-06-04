import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ProfileService } from '../profile.service';
import { Clinic } from '../../clinics/schemas/clinic.schema';
import { Professional } from '../../professionals/schemas/professional.schema';
import { Patient } from '../../patients/schemas/patient.schema';
import { User } from '../../auth/schemas/user.schema';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { GeocodingService } from '../../common/geocoding/geocoding.service';
import { Specialty } from '../../common/enums/specialty.enum';
import { Address } from '../../common/schemas/address.schema';

const mockAddress: Address = {
  street: 'Avenida Paulista',
  number: '1000',
  complement: 'Andar 5',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  country: 'BR',
};

const mockUserId = new Types.ObjectId().toHexString();

const mockClinic = {
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId(mockUserId),
  name: 'Clínica Teste',
  address: mockAddress,
  specialties: [Specialty.CARDIOLOGY, Specialty.DERMATOLOGY],
  isActive: true,
  save: jest.fn(),
};

const mockProfessional = {
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId(mockUserId),
  name: 'Dr. Teste',
  address: mockAddress,
  specialty: Specialty.PSYCHIATRY,
  isActive: true,
  save: jest.fn(),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const mockClinicModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClinic),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClinic),
      }),
    };

    const mockProfessionalModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProfessional),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProfessional),
      }),
    };

    const mockPatientModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getModelToken(Clinic.name),
          useValue: mockClinicModel,
        },
        {
          provide: getModelToken(Professional.name),
          useValue: mockProfessionalModel,
        },
        {
          provide: getModelToken(Patient.name),
          useValue: mockPatientModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            updateOne: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ acknowledged: true }),
            }),
          },
        },
        {
          provide: SubscriptionsService,
          useValue: { ensureForClinic: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: GeocodingService,
          useValue: { geocodeAddress: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClinicProfile', () => {
    it('should return clinic profile with Address subdocument', async () => {
      const result = await service.getClinicProfile(mockUserId);

      expect(result).toBeDefined();
      expect(result?.address).toEqual(mockAddress);
      expect(typeof result?.address).toBe('object');
      expect(result?.address).toHaveProperty('street');
      expect(result?.address).toHaveProperty('zipCode');
    });
  });

  describe('getProfessionalProfile', () => {
    it('should return professional profile with Address subdocument', async () => {
      const result = await service.getProfessionalProfile(mockUserId);

      expect(result).toBeDefined();
      expect(result?.address).toEqual(mockAddress);
      expect(typeof result?.address).toBe('object');
      expect(result?.specialty).toBe(Specialty.PSYCHIATRY);
    });
  });

  describe('updateClinicProfile', () => {
    it('should update clinic with new Address subdocument', async () => {
      const newAddress: Address = {
        street: 'Rua Nova',
        number: '200',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01425-000',
        country: 'BR',
      };

      (service as any).clinicModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockClinic, address: newAddress }),
      });

      const result = await service.updateClinicProfile(mockUserId, { address: newAddress });

      expect(result?.address).toEqual(newAddress);
      expect(typeof result?.address).not.toBe('string');
    });

    it('should sync the new email to the User login document', async () => {
      const updateOne = (service as any).userModel.updateOne as jest.Mock;

      await service.updateClinicProfile(mockUserId, { email: 'nova@clinica.com' });

      expect(updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(mockUserId) },
        { $set: { email: 'nova@clinica.com' } },
      );
    });

    it('should not touch the User document when no name or email changes', async () => {
      const updateOne = (service as any).userModel.updateOne as jest.Mock;

      await service.updateClinicProfile(mockUserId, { phone: '11999999999' });

      expect(updateOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the new email is already in use', async () => {
      (service as any).userModel.updateOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

      await expect(
        service.updateClinicProfile(mockUserId, { email: 'duplicado@clinica.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfessionalProfile', () => {
    it('should update professional specialty', async () => {
      (service as any).professionalModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProfessional,
          specialty: Specialty.CARDIOLOGY,
        }),
      });

      const result = await service.updateProfessionalProfile(mockUserId, {
        specialty: Specialty.CARDIOLOGY,
      });

      expect(result?.specialty).toBe(Specialty.CARDIOLOGY);
    });

    it('should sync the new email to the User login document', async () => {
      const updateOne = (service as any).userModel.updateOne as jest.Mock;

      await service.updateProfessionalProfile(mockUserId, {
        email: 'novo@medico.com',
      });

      expect(updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(mockUserId) },
        { $set: { email: 'novo@medico.com' } },
      );
    });

    it('should throw ConflictException when the new email is already in use', async () => {
      (service as any).userModel.updateOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

      await expect(
        service.updateProfessionalProfile(mockUserId, { email: 'duplicado@medico.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('address validation', () => {
    it('address should always be an object, never a string', async () => {
      const clinic = await service.getClinicProfile(mockUserId);
      const professional = await service.getProfessionalProfile(mockUserId);

      expect(typeof clinic?.address).toBe('object');
      expect(typeof professional?.address).toBe('object');
    });
  });
});
