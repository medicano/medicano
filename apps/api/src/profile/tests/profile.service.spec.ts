import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProfileService } from '../profile.service';
import { Patient } from '../schemas/patient.schema';
import { Professional } from '../schemas/professional.schema';
import { Specialty } from '../../common/enums/specialty.enum';

const addressFixture = {
  street: 'Rua Teste',
  number: '123',
  neighborhood: 'Centro',
  city: 'Campinas',
  state: 'SP',
  zipCode: '13000000',
};

const patientFixture = {
  _id: 'patient-1',
  userId: 'user-1',
  address: { ...addressFixture },
};

const professionalFixture = {
  _id: 'prof-1',
  name: 'Dr. Teste',
  cpf: '12345678901',
  registration: 'CRM/SP 123456',
  specialty: Specialty.MEDICINE,
  address: { ...addressFixture },
};

const mockPatientModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

const mockProfessionalModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getModelToken(Patient.name),
          useValue: mockPatientModel,
        },
        {
          provide: getModelToken(Professional.name),
          useValue: mockProfessionalModel,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    jest.clearAllMocks();
  });

  describe('getPatientProfile', () => {
    it('returns patient profile when found', async () => {
      mockPatientModel.findOne.mockResolvedValue(patientFixture);

      const result = await service.getPatientProfile('user-1');
      expect(result).toEqual(patientFixture);
      expect(mockPatientModel.findOne).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    it('throws NotFoundException when patient not found', async () => {
      mockPatientModel.findOne.mockResolvedValue(null);

      await expect(service.getPatientProfile('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrUpdatePatientProfile', () => {
    it('creates patient profile with structured address', async () => {
      const dto = {
        userId: 'user-1',
        address: { ...addressFixture },
      };

      mockPatientModel.findOneAndUpdate.mockResolvedValue({ _id: 'patient-1', ...dto });

      const result = await service.createOrUpdatePatientProfile('user-1', dto as any);
      expect(result).toBeDefined();
      expect(mockPatientModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.objectContaining({
          address: expect.objectContaining({
            street: 'Rua Teste',
            city: 'Campinas',
            state: 'SP',
          }),
        }),
        expect.any(Object),
      );
    });

    it('updates patient with partial address fields', async () => {
      const partialAddress = {
        street: 'Nova Rua',
        number: '456',
        neighborhood: 'Bairro Novo',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01000000',
      };

      mockPatientModel.findOneAndUpdate.mockResolvedValue({
        _id: 'patient-1',
        userId: 'user-1',
        address: partialAddress,
      });

      const result = await service.createOrUpdatePatientProfile('user-1', {
        address: partialAddress,
      } as any);

      expect(result).toBeDefined();
    });
  });

  describe('getProfessionalProfile', () => {
    it('returns professional profile when found', async () => {
      mockProfessionalModel.findOne.mockResolvedValue(professionalFixture);

      const result = await service.getProfessionalProfile('user-1');
      expect(result).toEqual(professionalFixture);
    });

    it('throws NotFoundException when professional not found', async () => {
      mockProfessionalModel.findOne.mockResolvedValue(null);

      await expect(service.getProfessionalProfile('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrUpdateProfessionalProfile', () => {
    it('creates professional profile with all required fields', async () => {
      const dto = {
        name: 'Dr. Teste',
        cpf: '12345678901',
        registration: 'CRM/SP 123456',
        specialty: Specialty.MEDICINE,
        address: { ...addressFixture },
      };

      mockProfessionalModel.findOneAndUpdate.mockResolvedValue({
        _id: 'prof-1',
        userId: 'user-1',
        ...dto,
      });

      const result = await service.createOrUpdateProfessionalProfile('user-1', dto as any);
      expect(result).toBeDefined();
      expect(mockProfessionalModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.objectContaining({
          name: 'Dr. Teste',
          cpf: '12345678901',
          registration: 'CRM/SP 123456',
          specialty: Specialty.MEDICINE,
          address: expect.objectContaining({
            street: 'Rua Teste',
            city: 'Campinas',
          }),
        }),
        expect.any(Object),
      );
    });

    it('professional fixture has all strict schema fields', () => {
      expect(professionalFixture).toMatchObject({
        name: expect.any(String),
        cpf: expect.any(String),
        registration: expect.any(String),
        specialty: expect.any(String),
        address: expect.objectContaining({
          street: expect.any(String),
          number: expect.any(String),
          neighborhood: expect.any(String),
          city: expect.any(String),
          state: expect.any(String),
          zipCode: expect.any(String),
        }),
      });
    });
  });

  describe('findProfessionalsBySpecialty', () => {
    it('returns professionals filtered by specialty', async () => {
      mockProfessionalModel.find.mockResolvedValue([professionalFixture]);

      const result = await service.findProfessionalsBySpecialty(Specialty.MEDICINE);
      expect(result).toHaveLength(1);
      expect(result[0].specialty).toBe(Specialty.MEDICINE);
    });

    it('returns empty array when no professionals found', async () => {
      mockProfessionalModel.find.mockResolvedValue([]);

      const result = await service.findProfessionalsBySpecialty(Specialty.MEDICINE);
      expect(result).toEqual([]);
    });
  });
});
