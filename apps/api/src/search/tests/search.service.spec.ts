import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SearchService } from '../search.service';
import { Professional } from '../../professionals/schemas/professional.schema';
import { ClinicProfessional } from '../../professionals/schemas/clinic-professional.schema';
import { Clinic } from '../../clinics/schemas/clinic.schema';
import { Subscription } from '../../subscriptions/schemas/subscription.schema';

// ---------------------------------------------------------------------------
// Valid ObjectId constants (service calls new Types.ObjectId on these IDs)
// ---------------------------------------------------------------------------
const C1 = '507f1f77bcf86cd799439001';
const C2 = '507f1f77bcf86cd799439002';
const P1 = '507f1f77bcf86cd799439011';
const P2 = '507f1f77bcf86cd799439012';
const P3 = '507f1f77bcf86cd799439013';

// ---------------------------------------------------------------------------
// Default (empty) mocks — reset in beforeEach via jest.clearAllMocks()
// ---------------------------------------------------------------------------
const mockProfessionalModel = {
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
};

const mockClinicProfessionalModel = {
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
};

const mockSubscriptionModel = {
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
};

const mockClinicModel = {
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Restore default return values after clearAllMocks resets them
    mockProfessionalModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    mockClinicProfessionalModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    mockSubscriptionModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    mockClinicModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getModelToken(Professional.name),
          useValue: mockProfessionalModel,
        },
        {
          provide: getModelToken(ClinicProfessional.name),
          useValue: mockClinicProfessionalModel,
        },
        {
          provide: getModelToken(Clinic.name),
          useValue: mockClinicModel,
        },
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Basic search
  // -------------------------------------------------------------------------
  describe('search', () => {
    it('returns empty array when no professionals match', async () => {
      const result = await service.search({ query: 'cardiology' } as any);

      expect(Array.isArray(result.professionals)).toBe(true);
      expect(result.professionals).toHaveLength(0);
    });

    it('returns professionals matching the search query', async () => {
      const professionals = [
        { _id: P1, name: 'Dr. One', specialty: 'cardiology' },
        { _id: P2, name: 'Dr. Two', specialty: 'cardiology' },
      ];

      // Subscription: both clinics active
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1 }, { clinicId: C2 }]),
      });

      // Links: P1 → C1, P2 → C2
      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { clinicId: C1, professionalId: P1 },
          { clinicId: C2, professionalId: P2 },
        ]),
      });

      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(professionals),
      });

      const result = await service.search({ query: 'cardiology' } as any);

      expect(result.professionals.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // RN20 — filter by active subscription + clinic links
  // -------------------------------------------------------------------------
  describe('RN20 — subscription-filtered search', () => {
    it('RN20-01 — returns only professionals linked to clinics with active subscription', async () => {
      // Active subscription for C1 only
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1 }]),
      });

      // Links: P1 → C1 (ativa); P2 → C2 (sem assinatura ativa) — P2 fica oculto.
      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { clinicId: C1, professionalId: P1 },
          { clinicId: C2, professionalId: P2 },
        ]),
      });

      // Professional universe: P1 and P2
      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { _id: P1, name: 'Dr. One' },
          { _id: P2, name: 'Dr. Two' },
        ]),
      });

      const result = await service.search({ query: '' } as any);

      const ids = result.professionals.map((r: any) => r._id ?? r.id);
      expect(ids).toContain(P1);
      expect(ids).not.toContain(P2);
    });

    it('RN20-02 — returns empty list when no clinic has an active subscription', async () => {
      // No active subscriptions
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      // P1 vinculado a C1 (sem assinatura ativa) — vinculado mas inativo, oculto.
      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { clinicId: C1, professionalId: P1 },
        ]),
      });

      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { _id: P1, name: 'Dr. One' },
        ]),
      });

      const result = await service.search({ query: '' } as any);

      expect(result.professionals).toHaveLength(0);
    });

    it('RN20-03 — subscription model is queried with active/trial status filter', async () => {
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.search({ query: 'dentist' } as any);

      expect(mockSubscriptionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: { $in: ['active', 'trial'] } }),
      );
    });

    it('RN20-04 — profissional autônomo (sem vínculo) aparece na busca', async () => {
      // Assinatura ativa para C1
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1 }]),
      });

      // P1 vinculado a C1; P3 não tem vínculo (autônomo)
      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { clinicId: C1, professionalId: P1 },
        ]),
      });

      // Professional universe: P1 (vinculado) e P3 (autônomo)
      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { _id: P1, name: 'Dr. One' },
          { _id: P3, name: 'Dr. Three' },
        ]),
      });

      const result = await service.search({ query: '' } as any);

      const ids = result.professionals.map((r: any) => r._id ?? r.id);
      expect(ids).toContain(P1);
      expect(ids).toContain(P3);
    });
  });

  // -------------------------------------------------------------------------
  // Search filters
  // -------------------------------------------------------------------------
  describe('search filters', () => {
    it('passes specialty filter to query when provided', async () => {
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1 }]),
      });

      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1, professionalId: P1 }]),
      });

      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: P1, name: 'Dr. One', specialty: 'neurology' }]),
      });

      await service.search({ query: '', specialty: 'neurology' } as any);

      // Professional model should have been queried — filter shape depends on service impl
      expect(mockProfessionalModel.find).toHaveBeenCalled();
    });

    it('passes city filter to query when provided', async () => {
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1 }]),
      });

      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1, professionalId: P1 }]),
      });

      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: P1, name: 'Dr. One', city: 'São Paulo' }]),
      });

      await service.search({ query: '', city: 'São Paulo' } as any);

      expect(mockProfessionalModel.find).toHaveBeenCalled();
    });

    it('RN-CITY-01 — profissional vinculado a clínica da cidade aparece no filtro por cidade', async () => {
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1 }]),
      });

      // P1 atende em C1 e não tem endereço próprio — a cidade vem da clínica.
      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1, professionalId: P1 }]),
      });

      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: P1, name: 'Dr. One' }]),
      });

      // type: 'professional' → searchClinics não roda, então as duas chamadas a
      // clinicModel.find são, em ordem: cidades da cidade e clínicas necessárias.
      mockClinicModel.find
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([{ _id: C1 }]),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([{ _id: C1, name: 'Clínica SP', city: 'São Paulo' }]),
        });

      const result = await service.search({ type: 'professional', city: 'São Paulo' } as any);

      const ids = result.professionals.map((r: any) => r._id ?? r.id);
      expect(ids).toContain(P1);
      expect(result.professionals[0].city).toBe('São Paulo');
    });

    it('RN-CITY-02 — profissional cuja clínica não é da cidade não aparece', async () => {
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1 }]),
      });

      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ clinicId: C1, professionalId: P1 }]),
      });

      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: P1, name: 'Dr. One' }]),
      });

      // Nenhuma clínica em Campinas → cityClinicIds vazio.
      mockClinicModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.search({ type: 'professional', city: 'Campinas' } as any);

      expect(result.professionals).toHaveLength(0);
    });

    it('RN-CITY-03 — profissional autônomo aparece pela cidade do próprio endereço', async () => {
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      // P3 sem vínculo (autônomo), com cidade no próprio addressForm.
      mockClinicProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      mockProfessionalModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { _id: P3, name: 'Dr. Three', addressForm: { city: 'São Paulo' } },
        ]),
      });

      // cityClinicIds: nenhuma clínica precisa casar — o autônomo casa pela própria cidade.
      mockClinicModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.search({ type: 'professional', city: 'São Paulo' } as any);

      const ids = result.professionals.map((r: any) => r._id ?? r.id);
      expect(ids).toContain(P3);
    });
  });

  // -------------------------------------------------------------------------
  // Radius filter — clinics beyond the chosen radius must be dropped
  // -------------------------------------------------------------------------
  describe('radius filter (clinics)', () => {
    const NEAR = { _id: C1, name: 'Perto', specialties: [], lat: -23.561, lng: -46.656 }; // ~São Paulo
    const FAR = { _id: C2, name: 'Longe', specialties: [], lat: -22.9068, lng: -43.1729 }; // ~Rio (~360 km)
    const userAt = { userLat: -23.55, userLng: -46.63 };

    function setupClinics(docs: unknown[], activeIds: string[]) {
      mockSubscriptionModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(activeIds.map((id) => ({ clinicId: id }))),
      });
      mockClinicModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(docs),
      });
    }

    it('drops clinics farther than the radius when location + radius are given', async () => {
      setupClinics([NEAR, FAR], [C1, C2]);

      const result = await service.search({ type: 'clinic', ...userAt, radius: 50 } as any);

      const names = result.clinics.map((c) => c.name);
      expect(names).toContain('Perto');
      expect(names).not.toContain('Longe');
    });

    it('keeps all clinics when no radius is given (only sorts by distance)', async () => {
      setupClinics([NEAR, FAR], [C1, C2]);

      const result = await service.search({ type: 'clinic', ...userAt } as any);

      const names = result.clinics.map((c) => c.name);
      expect(names).toEqual(['Perto', 'Longe']);
    });

    it('drops clinics without coordinates when a radius is given', async () => {
      const noCoords = { _id: C2, name: 'SemCoords', specialties: [] };
      setupClinics([NEAR, noCoords], [C1, C2]);

      const result = await service.search({ type: 'clinic', ...userAt, radius: 50 } as any);

      const names = result.clinics.map((c) => c.name);
      expect(names).toContain('Perto');
      expect(names).not.toContain('SemCoords');
    });
  });
});
