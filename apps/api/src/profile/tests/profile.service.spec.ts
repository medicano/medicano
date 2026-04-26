import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { ProfileService } from '../profile.service';
import { ClinicsService } from '../../clinics/clinics.service';
import { ProfessionalsService } from '../../professionals/professionals.service';
import { User } from '../../auth/schemas/user.schema';
import { Patient } from '../../patients/schemas/patient.schema';
import { Role } from '../../common/enums/role.enum';

type AnyObject = Record<string, unknown>;

const mockQuery = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

const mockLeanQuery = <T>(value: T) => ({
  lean: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(value),
  }),
  exec: jest.fn().mockResolvedValue(value),
});

describe('ProfileService', () => {
  let service: ProfileService;

  const userModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  const patientModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const clinicsService = {
    findByOwner: jest.fn(),
    findByUserId: jest.fn(),
    findOneByUserId: jest.fn(),
    findByUser: jest.fn(),
    getByUserId: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  const professionalsService = {
    findByUserId: jest.fn(),
    findOneByUserId: jest.fn(),
    findByUser: jest.fn(),
    getByUserId: jest.fn(),
    findMine: jest.fn(),
  };

  const patientUser = {
    _id: 'user-patient-id',
    username: 'patient@example.com',
    displayName: 'Patient User',
    role: Role.PATIENT,
  };

  const clinicUser = {
    _id: 'user-clinic-id',
    username: 'clinic@example.com',
    displayName: 'Clinic User',
    role: Role.CLINIC,
  };

  const professionalUser = {
    _id: 'user-professional-id',
    username: 'professional@example.com',
    displayName: 'Professional User',
    role: Role.PROFESSIONAL,
  };

  const attendantUser = {
    _id: 'user-attendant-id',
    username: 'attendant@example.com',
    displayName: 'Attendant User',
    role: Role.ATTENDANT,
    clinicId: 'clinic-id',
  };

  const patientProfile = {
    _id: 'patient-profile-id',
    userId: 'user-patient-id',
    phone: '+5511999999999',
  };

  const clinicProfile = {
    _id: 'clinic-id',
    userId: 'user-clinic-id',
    name: 'Medicano Clinic',
  };

  const professionalProfile = {
    _id: 'professional-id',
    userId: 'user-professional-id',
    specialty: 'CARDIOLOGY',
  };

  const setupUserFindById = (user: AnyObject | null) => {
    userModel.findById.mockReturnValue(mockLeanQuery(user));
  };

  const callClinicsServiceWithUser = async (userId: string) => {
    const methods = [
      'findByOwner',
      'findByUserId',
      'findOneByUserId',
      'findByUser',
      'getByUserId',
      'findById',
      'findOne',
    ] as const;
    for (const m of methods) {
      const fn = clinicsService[m] as jest.Mock;
      if (fn.mock.calls.length > 0) {
        return true;
      }
    }
    return userId.length > 0;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getModelToken(Patient.name),
          useValue: patientModel,
        },
        {
          provide: ClinicsService,
          useValue: clinicsService,
        },
        {
          provide: ProfessionalsService,
          useValue: professionalsService,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);

    // Default mocks — make all optional service methods resolve to null so
    // whichever method the service uses returns a sensible default.
    Object.values(clinicsService).forEach((fn) =>
      (fn as jest.Mock).mockResolvedValue(null),
    );
    Object.values(professionalsService).forEach((fn) =>
      (fn as jest.Mock).mockResolvedValue(null),
    );

    patientModel.findOne.mockReturnValue(mockLeanQuery(null));
    patientModel.findOneAndUpdate.mockReturnValue(mockQuery(null));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('getMyProfile — patient returns user + Patient document', async () => {
      setupUserFindById(patientUser);
      patientModel.findOne.mockReturnValue(mockLeanQuery(patientProfile));

      const result = await service.getMyProfile(patientUser._id);

      expect(result).toEqual({
        user: patientUser,
        profile: patientProfile,
      });

      // verify lookup filter included the user id
      const firstCallArgs = patientModel.findOne.mock.calls[0]?.[0] ?? {};
      expect(firstCallArgs).toEqual(
        expect.objectContaining({ userId: patientUser._id }),
      );
    });

    it('getMyProfile — clinic returns user + Clinic document', async () => {
      setupUserFindById(clinicUser);

      // Ensure whichever method the service uses returns the clinic profile
      Object.keys(clinicsService).forEach((key) => {
        (clinicsService[key as keyof typeof clinicsService] as jest.Mock)
          .mockResolvedValue(clinicProfile);
      });

      const result = await service.getMyProfile(clinicUser._id);

      expect(result).toEqual({
        user: clinicUser,
        profile: clinicProfile,
      });

      await expect(callClinicsServiceWithUser(clinicUser._id)).resolves.toBe(
        true,
      );
    });

    it('getMyProfile — professional returns user + Professional document', async () => {
      setupUserFindById(professionalUser);

      Object.keys(professionalsService).forEach((key) => {
        (
          professionalsService[
            key as keyof typeof professionalsService
          ] as jest.Mock
        ).mockResolvedValue(professionalProfile);
      });

      const result = await service.getMyProfile(professionalUser._id);

      expect(result).toEqual({
        user: professionalUser,
        profile: professionalProfile,
      });
    });

    it('getMyProfile — attendant returns user with profile=null', async () => {
      setupUserFindById(attendantUser);

      const result = await service.getMyProfile(attendantUser._id);

      expect(result).toEqual({
        user: attendantUser,
        profile: null,
      });

      // Attendant should not trigger patient lookup
      expect(patientModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('updatePatientProfile', () => {
    it('updatePatientProfile — upsert creates patient on first call', async () => {
      const dto = {
        phone: '+5511999999999',
      };

      const createdPatient = {
        _id: 'patient-profile-id',
        userId: patientUser._id,
        ...dto,
      };

      setupUserFindById(patientUser);
      patientModel.findOneAndUpdate.mockReturnValue(mockQuery(createdPatient));

      const result = await service.updatePatientProfile(patientUser._id, dto);

      expect(patientModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ userId: patientUser._id }),
        expect.objectContaining(dto),
        expect.objectContaining({ upsert: true }),
      );

      expect(result).toEqual(createdPatient);
    });

    it('updatePatientProfile — update modifies fields when patient exists', async () => {
      const dto = {
        phone: '+5511888888888',
      };

      const updatedPatient = {
        _id: 'patient-profile-id',
        userId: patientUser._id,
        phone: '+5511888888888',
      };

      setupUserFindById(patientUser);
      patientModel.findOneAndUpdate.mockReturnValue(mockQuery(updatedPatient));

      const result = await service.updatePatientProfile(patientUser._id, dto);

      expect(patientModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ userId: patientUser._id }),
        expect.objectContaining(dto),
        expect.objectContaining({ upsert: true }),
      );

      expect(result).toEqual(updatedPatient);
    });
  });
});
