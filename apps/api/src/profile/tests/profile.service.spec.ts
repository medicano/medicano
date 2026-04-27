import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProfileService } from '../profile.service';
import { Professional } from '../../professionals/schemas/professional.schema';
import { Specialty } from '../../common/enums/specialty.enum';
import { UpdateProfessionalProfileDto } from '../dto/update-professional-profile.dto';

const mockAddress = {
  street: 'Rua das Flores',
  number: '123',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
};

const mockProfessional = {
  _id: '64a1b2c3d4e5f6a7b8c9d0e1',
  userId: '64a1b2c3d4e5f6a7b8c9d0e0',
  name: 'Dr. João Silva',
  specialty: Specialty.CARDIOLOGY,
  cpf: '12345678901',
  registration: 'CRM12345',
  address: mockAddress,
  phone: '11999999999',
  description: 'Cardiologista experiente',
  weeklySlots: [],
  autoConfirm: false,
  minCancelNoticeHours: 24,
};

const mockProfessionalModel = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getModelToken(Professional.name),
          useValue: mockProfessionalModel,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    jest.clearAllMocks();
  });

  describe('getProfessionalProfile', () => {
    it('should return a professional profile by userId', async () => {
      mockProfessionalModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProfessional),
      });

      const result = await service.getProfessionalProfile(mockProfessional.userId);

      expect(mockProfessionalModel.findOne).toHaveBeenCalledWith({ userId: mockProfessional.userId });
      expect(result).toEqual(mockProfessional);
    });

    it('should throw NotFoundException when professional not found', async () => {
      mockProfessionalModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getProfessionalProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfessionalProfile', () => {
    it('should update professional profile with new address object', async () => {
      const updateDto: UpdateProfessionalProfileDto = {
        address: {
          street: 'Av. Paulista',
          number: '1000',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-200',
        },
        description: 'Descrição atualizada',
        autoConfirm: true,
        minCancelNoticeHours: 48,
      };

      const updatedProfessional = {
        ...mockProfessional,
        ...updateDto,
      };

      mockProfessionalModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProfessional),
      });

      const result = await service.updateProfessionalProfile(mockProfessional.userId, updateDto);

      expect(mockProfessionalModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: mockProfessional.userId },
        { $set: updateDto },
        { new: true, runValidators: true },
      );
      expect(result.address).toEqual(updateDto.address);
      expect(result.autoConfirm).toBe(true);
      expect(result.minCancelNoticeHours).toBe(48);
    });

    it('should throw NotFoundException when professional not found during update', async () => {
      mockProfessionalModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateProfessionalProfile('nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('formatProfileSummary', () => {
    it('should format profile summary using address.city and address.state', () => {
      const result = service.formatProfileSummary(mockProfessional as any);
      expect(result).toBe(`${mockProfessional.name} — ${mockProfessional.specialty} — ${mockProfessional.address.city}, ${mockProfessional.address.state}`);
    });

    it('should handle missing address fields gracefully', () => {
      const professionalWithoutAddress = {
        ...mockProfessional,
        address: null as any,
      };
      const result = service.formatProfileSummary(professionalWithoutAddress as any);
      expect(result).toBe(`${mockProfessional.name} — ${mockProfessional.specialty} — unknown city, unknown state`);
    });
  });
});
