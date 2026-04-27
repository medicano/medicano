import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

import { ScheduleService } from '../services/schedule.service';
import { AvailabilityService } from '../availability.service';
import { AppointmentsService } from '../../appointments/appointments.service';
import { ProfessionalsService } from '../../professionals/professionals.service';
import { ClinicProfessional } from '../../professionals/schemas/clinic-professional.schema';
import { User } from '../../auth/schemas/user.schema';
import { Role } from '../../common/enums/role.enum';

describe('ScheduleService', () => {
  let service: ScheduleService;

  const availabilityService = {
    getAvailableSlots: jest.fn(),
  };
  const appointmentsService = {
    findAll: jest.fn(),
  };
  const professionalsService = {
    findOne: jest.fn(),
  };
  const clinicProfessionalModel = {
    findOne: jest.fn(),
  };
  const userModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  const professionalId = 'prof-1';
  const professionalUserId = 'user-prof-1';

  const professionalDoc = {
    _id: professionalId,
    userId: professionalUserId,
    name: 'Dr. House',
  };

  const slot1 = {
    date: '2025-01-10',
    startTime: '09:00',
    endTime: '09:30',
    duration: 30,
  };
  const slot2 = {
    date: '2025-01-10',
    startTime: '09:30',
    endTime: '10:00',
    duration: 30,
  };
  const appt1 = {
    _id: 'appt-1',
    professionalId,
    patientId: 'patient-1',
    startAt: new Date('2025-01-10T10:00:00Z'),
    endAt: new Date('2025-01-10T10:30:00Z'),
    status: 'confirmed' as const,
  };

  const query = { from: '2025-01-10', to: '2025-01-11' } as any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: AvailabilityService, useValue: availabilityService },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: ProfessionalsService, useValue: professionalsService },
        {
          provide: getModelToken(ClinicProfessional.name),
          useValue: clinicProfessionalModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProviderSchedule', () => {
    it('combined response returns slots and appointments', async () => {
      const currentUser = {
        userId: professionalUserId,
        role: Role.PROFESSIONAL,
      };

      professionalsService.findOne.mockResolvedValue(professionalDoc);
      availabilityService.getAvailableSlots.mockResolvedValue([slot1, slot2]);
      appointmentsService.findAll.mockResolvedValue([appt1]);

      const result = await service.getProviderSchedule(
        professionalId,
        query,
        currentUser as any,
      );

      expect(result).toEqual({
        slots: [slot1, slot2],
        appointments: [appt1],
      });
      expect(availabilityService.getAvailableSlots).toHaveBeenCalledTimes(1);
      expect(appointmentsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('professional accessing own schedule allowed', async () => {
      const currentUser = {
        userId: professionalUserId,
        role: Role.PROFESSIONAL,
      };

      professionalsService.findOne.mockResolvedValue(professionalDoc);
      availabilityService.getAvailableSlots.mockResolvedValue([]);
      appointmentsService.findAll.mockResolvedValue([]);

      await expect(
        service.getProviderSchedule(professionalId, query, currentUser as any),
      ).resolves.toBeDefined();
    });

    it('clinic accessing linked professional allowed', async () => {
      const currentUser = {
        userId: 'clinic-user-1',
        role: Role.CLINIC,
      };

      professionalsService.findOne.mockResolvedValue(professionalDoc);
      clinicProfessionalModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ clinicId: 'clinic-1', professionalId }),
      });

      availabilityService.getAvailableSlots.mockResolvedValue([slot1]);
      appointmentsService.findAll.mockResolvedValue([]);

      const result = await service.getProviderSchedule(
        professionalId,
        query,
        currentUser as any,
      );

      expect(result.slots).toEqual([slot1]);
      expect(clinicProfessionalModel.findOne).toHaveBeenCalled();
    });

    it('clinic accessing UNLINKED professional throws ForbiddenException', async () => {
      const currentUser = {
        userId: 'clinic-user-1',
        role: Role.CLINIC,
      };

      professionalsService.findOne.mockResolvedValue(professionalDoc);
      clinicProfessionalModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getProviderSchedule(professionalId, query, currentUser as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('professional accessing another professional throws ForbiddenException', async () => {
      const currentUser = {
        userId: 'user-prof-OTHER',
        role: Role.PROFESSIONAL,
      };

      professionalsService.findOne.mockResolvedValue(professionalDoc);

      await expect(
        service.getProviderSchedule(professionalId, query, currentUser as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('patient role throws ForbiddenException at the service layer', async () => {
      const currentUser = {
        userId: 'patient-user-1',
        role: Role.PATIENT,
      };

      professionalsService.findOne.mockResolvedValue(professionalDoc);

      await expect(
        service.getProviderSchedule(professionalId, query, currentUser as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
