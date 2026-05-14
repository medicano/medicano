import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SearchService } from '../search.service';
import { Professional } from '../../professionals/schemas/professional.schema';
import { ClinicProfessional } from '../../professionals/schemas/clinic-professional.schema';
import { Subscription } from '../../subscriptions/schemas/subscription.schema';
import { SearchQueryDto } from '../dto/search-query.dto';

const clinicIdActive = new Types.ObjectId();
const clinicIdInactive = new Types.ObjectId();
const professionalIdActive = new Types.ObjectId();
const professionalIdInactive = new Types.ObjectId();
const professionalIdMultiClinic = new Types.ObjectId();

const mockProfessionalActive = {
  _id: professionalIdActive,
  name: 'Dr. Active',
  specialty: 'Cardiology',
  address: { city: 'São Paulo', state: 'SP', street: 'Rua A', zip: '00000-000' },
  avatarUrl: undefined,
};

const mockProfessionalInactive = {
  _id: professionalIdInactive,
  name: 'Dr. Inactive',
  specialty: 'Neurology',
  address: { city: 'Rio de Janeiro', state: 'RJ', street: 'Rua B', zip: '11111-111' },
  avatarUrl: undefined,
};

const mockProfessionalMultiClinic = {
  _id: professionalIdMultiClinic,
  name: 'Dr. MultiClinic',
  specialty: 'Orthopedics',
  address: { city: 'Belo Horizonte', state: 'MG', street: 'Rua C', zip: '22222-222' },
  avatarUrl: undefined,
};

function buildProfessionalModel(professionals: unknown[]) {
  return {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(professionals),
    }),
  };
}

function buildSubscriptionModel(subscriptions: unknown[]) {
  return {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(subscriptions),
    }),
  };
}

function buildClinicProfessionalModel(links: unknown[]) {
  return {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(links),
    }),
  };
}

async function buildModule(
  professionals: unknown[],
  subscriptions: unknown[],
  clinicProfessionalLinks: unknown[],
): Promise<SearchService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SearchService,
      {
        provide: getModelToken(Professional.name),
        useValue: buildProfessionalModel(professionals),
      },
      {
        provide: getModelToken(ClinicProfessional.name),
        useValue: buildClinicProfessionalModel(clinicProfessionalLinks),
      },
      {
        provide: getModelToken(Subscription.name),
        useValue: buildSubscriptionModel(subscriptions),
      },
    ],
  }).compile();

  return module.get<SearchService>(SearchService);
}

describe('SearchService', () => {
  const emptyQuery: SearchQueryDto = {};

  describe('RN20 — subscription status filter', () => {
    it('should return professional when linked to a clinic with status="active"', async () => {
      const service = await buildModule(
        [mockProfessionalActive],
        [{ clinicId: clinicIdActive }],
        [{ professionalId: professionalIdActive, clinicId: clinicIdActive }],
      );

      const results = await service.search(emptyQuery);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(professionalIdActive.toString());
      expect(results[0].name).toBe('Dr. Active');
    });

    it('should return professional when linked to a clinic with status="trial"', async () => {
      const clinicIdTrial = new Types.ObjectId();
      const professionalIdTrial = new Types.ObjectId();
      const mockProfessionalTrial = {
        _id: professionalIdTrial,
        name: 'Dr. Trial',
        specialty: 'Dermatology',
        address: { city: 'Curitiba', state: 'PR', street: 'Rua D', zip: '33333-333' },
        avatarUrl: undefined,
      };

      const service = await buildModule(
        [mockProfessionalTrial],
        [{ clinicId: clinicIdTrial }],
        [{ professionalId: professionalIdTrial, clinicId: clinicIdTrial }],
      );

      const results = await service.search(emptyQuery);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(professionalIdTrial.toString());
      expect(results[0].name).toBe('Dr. Trial');
    });

    it('should NOT return professional when only linked clinic has status="cancelled"', async () => {
      // Subscription model returns empty (cancelled clinics are not returned by the $in filter)
      const service = await buildModule(
        [mockProfessionalInactive],
        [], // no active/trial subscriptions
        [{ professionalId: professionalIdInactive, clinicId: clinicIdInactive }],
      );

      const results = await service.search(emptyQuery);

      expect(results).toHaveLength(0);
    });

    it('should return [] when there are no active or trial subscriptions', async () => {
      const service = await buildModule(
        [mockProfessionalActive, mockProfessionalInactive],
        [], // no active/trial subscriptions → short-circuit
        [],
      );

      const results = await service.search(emptyQuery);

      expect(results).toHaveLength(0);
    });

    it('should return professional linked to multiple clinics when at least one is active', async () => {
      // professionalIdMultiClinic is linked to both clinicIdActive (active) and clinicIdInactive (cancelled)
      // Only clinicIdActive appears in active subscriptions
      const service = await buildModule(
        [mockProfessionalMultiClinic],
        [{ clinicId: clinicIdActive }],
        [
          { professionalId: professionalIdMultiClinic, clinicId: clinicIdActive },
          { professionalId: professionalIdMultiClinic, clinicId: clinicIdInactive },
        ],
      );

      const results = await service.search(emptyQuery);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(professionalIdMultiClinic.toString());
      expect(results[0].name).toBe('Dr. MultiClinic');
    });

    it('should NOT return professional with no ClinicProfessional link', async () => {
      const service = await buildModule(
        [mockProfessionalActive],
        [{ clinicId: clinicIdActive }],
        [], // no links at all
      );

      const results = await service.search(emptyQuery);

      expect(results).toHaveLength(0);
    });

    it('should return only professionals linked to active clinics when mixed results exist', async () => {
      const service = await buildModule(
        [mockProfessionalActive, mockProfessionalInactive],
        [{ clinicId: clinicIdActive }],
        [
          { professionalId: professionalIdActive, clinicId: clinicIdActive },
          // professionalIdInactive is only linked to clinicIdInactive which has no active subscription
        ],
      );

      const results = await service.search(emptyQuery);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(professionalIdActive.toString());
    });
  });

  describe('search() output mapping', () => {
    it('should correctly map professional fields to SearchResult', async () => {
      const service = await buildModule(
        [mockProfessionalActive],
        [{ clinicId: clinicIdActive }],
        [{ professionalId: professionalIdActive, clinicId: clinicIdActive }],
      );

      const results = await service.search(emptyQuery);

      expect(results[0]).toMatchObject({
        id: professionalIdActive.toString(),
        name: 'Dr. Active',
        specialty: 'Cardiology',
        address: {
          city: 'São Paulo',
          state: 'SP',
          street: 'Rua A',
          zip: '00000-000',
        },
      });
    });
  });
});
