import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SearchService } from '../search.service';
import { Professional } from '../../professionals/schemas/professional.schema';
import { Specialty } from '../../common/enums/specialty.enum';

const mockAddress = {
  street: 'Rua das Flores',
  number: '123',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
};

const mockProfessionals = [
  {
    _id: '64a1b2c3d4e5f6a7b8c9d0e1',
    userId: '64a1b2c3d4e5f6a7b8c9d0e0',
    name: 'Dr. João Silva',
    specialty: Specialty.CARDIOLOGY,
    cpf: '12345678901',
    registration: 'CRM12345',
    address: { ...mockAddress },
    phone: '11999999999',
    description: 'Cardiologista experiente',
    weeklySlots: [],
    autoConfirm: false,
    minCancelNoticeHours: 24,
  },
  {
    _id: '64a1b2c3d4e5f6a7b8c9d0e2',
    userId: '64a1b2c3d4e5f6a7b8c9d0e3',
    name: 'Dra. Maria Souza',
    specialty: Specialty.DERMATOLOGY,
    cpf: '98765432100',
    registration: 'CRM54321',
    address: { ...mockAddress, city: 'Rio de Janeiro', state: 'RJ' },
    phone: '21999999999',
    description: 'Dermatologista especializada',
    weeklySlots: [],
    autoConfirm: true,
    minCancelNoticeHours: 12,
  },
];

const mockProfessionalModel = {
  find: jest.fn(),
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getModelToken(Professional.name),
          useValue: mockProfessionalModel,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search by address.city field, not address as string', async () => {
      mockProfessionalModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockProfessionals[0]]),
      });

      const results = await service.search({ city: 'São Paulo' });

      expect(mockProfessionalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'address.city': expect.any(Object),
        }),
      );
      expect(results).toHaveLength(1);
      expect(results[0].city).toBe('São Paulo');
    });

    it('should search by address.state field', async () => {
      mockProfessionalModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockProfessionals[1]]),
      });

      const results = await service.search({ state: 'RJ' });

      expect(mockProfessionalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'address.state': expect.any(Object),
        }),
      );
      expect(results[0].state).toBe('RJ');
    });

    it('should search by specialty', async () => {
      mockProfessionalModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockProfessionals[0]]),
      });

      const results = await service.search({ specialty: Specialty.CARDIOLOGY });

      expect(mockProfessionalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ specialty: Specialty.CARDIOLOGY }),
      );
      expect(results[0].specialty).toBe(Specialty.CARDIOLOGY);
    });

    it('should combine city and specialty filters for compound index usage', async () => {
      mockProfessionalModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockProfessionals[0]]),
      });

      await service.search({ city: 'São Paulo', specialty: Specialty.CARDIOLOGY });

      expect(mockProfessionalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'address.city': expect.any(Object),
          specialty: Specialty.CARDIOLOGY,
        }),
      );
    });

    it('should map results to SearchResult shape with city and state from address object', async () => {
      mockProfessionalModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProfessionals),
      });

      const results = await service.search({});

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        name: 'Dr. João Silva',
        specialty: Specialty.CARDIOLOGY,
        city: 'São Paulo',
        state: 'SP',
        autoConfirm: false,
      });
      expect(results[1]).toMatchObject({
        name: 'Dra. Maria Souza',
        specialty: Specialty.DERMATOLOGY,
        city: 'Rio de Janeiro',
        state: 'RJ',
        autoConfirm: true,
      });
    });

    it('should return empty array when no professionals match', async () => {
      mockProfessionalModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const results = await service.search({ city: 'Nowhere' });

      expect(results).toHaveLength(0);
    });
  });

  describe('findBySpecialtyAndCity', () => {
    it('should query using address.city and specialty', async () => {
      mockProfessionalModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockProfessionals[0]]),
      });

      const results = await service.findBySpecialtyAndCity(Specialty.CARDIOLOGY, 'São Paulo');

      expect(mockProfessionalModel.find).toHaveBeenCalledWith({
        specialty: Specialty.CARDIOLOGY,
        'address.city': { $regex: expect.any(RegExp) },
      });
      expect(results).toHaveLength(1);
    });
  });
});
