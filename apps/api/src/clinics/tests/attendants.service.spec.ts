import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClinicsService } from '../clinics.service';
import { Clinic } from '../schemas/clinic.schema';
import { Specialty } from '../../common/enums/specialty.enum';
import { Address } from '../../common/schemas/address.schema';

const mockAddress: Address = {
  street: 'Rua das Flores',
  number: '123',
  complement: 'Sala 1',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  country: 'BR',
};

const mockUserId = new Types.ObjectId().toHexString();

const mockClinic = {
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId(mockUserId),
  name: 'Clínica Saúde Total',
  description: 'Clínica de saúde completa',
  phone: '11999999999',
  email: 'contato@clinica.com',
  address: mockAddress,
  specialties: [Specialty.GENERAL_PRACTICE, Specialty.PEDIATRICS],
  isActive: true,
  save: jest.fn().mockResolvedValue(this),
};

describe('ClinicsService', () => {
  let service: ClinicsService;
  let mockModel: any;

  beforeEach(async () => {
    const mockSave = jest.fn().mockResolvedValue(mockClinic);
    const mockModelConstructor = jest.fn().mockImplementation(() => ({
      ...mockClinic,
      save: mockSave,
    }));

    mockModel = mockModelConstructor;
    mockModel.find = jest.fn();
    mockModel.findById = jest.fn();
    mockModel.findOne = jest.fn();
    mockModel.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        {
          provide: getModelToken(Clinic.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<ClinicsService>(ClinicsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a clinic with Address subdocument', async () => {
      const createDto = {
        name: 'Clínica Saúde Total',
        address: mockAddress,
        specialties: [Specialty.GENERAL_PRACTICE],
      };

      const result = await service.create(mockUserId, createDto);

      expect(result).toBeDefined();
      expect(result.address).toEqual(mockAddress);
      expect(typeof result.address).not.toBe('string');
    });
  });

  describe('findAllByUser', () => {
    it('should return all active clinics for a user', async () => {
      (service as any).clinicModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockClinic]),
      });

      const result = await service.findAllByUser(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].address).toEqual(mockAddress);
    });
  });

  describe('findById', () => {
    it('should return clinic by id', async () => {
      (service as any).clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClinic),
      });

      const result = await service.findById(mockClinic._id.toHexString());

      expect(result).toEqual(mockClinic);
      expect(result.specialties).toContain(Specialty.GENERAL_PRACTICE);
    });

    it('should throw NotFoundException if clinic not found', async () => {
      (service as any).clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update clinic address as subdocument', async () => {
      const updatedAddress: Address = {
        ...mockAddress,
        city: 'Rio de Janeiro',
        state: 'RJ',
      };

      const updatableClinic = {
        ...mockClinic,
        userId: new Types.ObjectId(mockUserId),
        save: jest.fn().mockResolvedValue({ ...mockClinic, address: updatedAddress }),
      };

      (service as any).clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatableClinic),
      });

      const result = await service.update(
        mockClinic._id.toHexString(),
        mockUserId,
        { address: updatedAddress },
      );

      expect(result.address).toEqual(updatedAddress);
    });

    it('should throw ForbiddenException when updating another users clinic', async () => {
      const otherUserId = new Types.ObjectId().toHexString();

      (service as any).clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClinic),
      });

      await expect(
        service.update(mockClinic._id.toHexString(), otherUserId, { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('address is always an object', () => {
    it('clinic address should never be a string', async () => {
      (service as any).clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClinic),
      });

      const clinic = await service.findById(mockClinic._id.toHexString());

      expect(typeof clinic.address).toBe('object');
      expect(clinic.address).toHaveProperty('street');
      expect(clinic.address).toHaveProperty('city');
      expect(clinic.address).toHaveProperty('state');
      expect(clinic.address).toHaveProperty('zipCode');
    });
  });
});
