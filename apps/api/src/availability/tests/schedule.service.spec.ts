import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ScheduleService } from '../services/schedule.service';
import { AvailabilityService } from '../availability.service';
import { AppointmentsService } from '../../appointments/appointments.service';
import { ProfessionalsService } from '../../professionals/professionals.service';
import { Role } from '../../common/enums/role.enum';

const mockAvailabilityService = {
  getAvailableSlots: jest.fn().mockResolvedValue([]),
};

const mockAppointmentsService = {
  findAll: jest.fn().mockResolvedValue([]),
};

const mockProfessionalsService = {
  findById: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn(),
};

const mockClinicProfessionalModel = {
  findOne: jest.fn(),
};

describe('ScheduleService', () => {
  let service: ScheduleService;

  const professionalId = '64f1a2b3c4d5e6f7a8b9c0d1';
  const currentUserId = '64f1a2b3c4d5e6f7a8b9c0d2';
  const clinicId = '64f1a2b3c4d5e6f7a8b9c0d3';

  const query = { fromDate: '2024-01-01', toDate: '2024-01-07' };

  const makeProfessional = (userId: string) => ({
    _id: professionalId,
    userId,
  });

  const makeUser = (role: string, extra: Record<string, any> = {}) => ({
    _id: currentUserId,
    role,
    ...extra,
  });

  const execMock = (value: any) => ({ exec: jest.fn().mockResolvedValue(value) });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: AppointmentsService, useValue: mockAppointmentsService },
        { provide: ProfessionalsService, useValue: mockProfessionalsService },
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: getModelToken('ClinicProfessional'), useValue: mockClinicProfessionalModel },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);

    jest.clearAllMocks();
    mockAvailabilityService.getAvailableSlots.mockResolvedValue([]);
    mockAppointmentsService.findAll.mockResolvedValue([]);
  });

  it('should throw BadRequestException for invalid professionalId', async () => {
    await expect(
      service.getProviderSchedule('invalid-id', query, currentUserId),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when user not found', async () => {
    mockUserModel.findById.mockReturnValue(execMock(null));

    await expect(
      service.getProviderSchedule(professionalId, query, currentUserId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when professional not found', async () => {
    mockUserModel.findById.mockReturnValue(execMock(makeUser(Role.PROFESSIONAL)));
    mockProfessionalsService.findById.mockResolvedValue(null);

    await expect(
      service.getProviderSchedule(professionalId, query, currentUserId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should allow a professional to access their own schedule', async () => {
    mockUserModel.findById.mockReturnValue(execMock(makeUser(Role.PROFESSIONAL)));
    mockProfessionalsService.findById.mockResolvedValue(
      makeProfessional(currentUserId),
    );

    const result = await service.getProviderSchedule(professionalId, query, currentUserId);

    expect(result).toEqual({
      fromDate: query.fromDate,
      toDate: query.toDate,
      availableSlots: [],
      appointments: [],
    });
  });

  it('should throw ForbiddenException when professional accesses another professional schedule', async () => {
    mockUserModel.findById.mockReturnValue(execMock(makeUser(Role.PROFESSIONAL)));
    mockProfessionalsService.findById.mockResolvedValue(
      makeProfessional('64f1a2b3c4d5e6f7a8b9c0ff'),
    );

    await expect(
      service.getProviderSchedule(professionalId, query, currentUserId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow a clinic with a matching ClinicProfessional link', async () => {
    mockUserModel.findById.mockReturnValue(
      execMock(makeUser(Role.CLINIC, { clinicId })),
    );
    mockProfessionalsService.findById.mockResolvedValue(
      makeProfessional('64f1a2b3c4d5e6f7a8b9c0ff'),
    );
    mockClinicProfessionalModel.findOne.mockReturnValue(
      execMock({ clinicId, professionalId }),
    );

    const result = await service.getProviderSchedule(professionalId, query, currentUserId);

    expect(result.fromDate).toBe(query.fromDate);
    expect(result.toDate).toBe(query.toDate);
  });

  it('should throw ForbiddenException when clinic has no ClinicProfessional link', async () => {
    mockUserModel.findById.mockReturnValue(
      execMock(makeUser(Role.CLINIC, { clinicId })),
    );
    mockProfessionalsService.findById.mockResolvedValue(
      makeProfessional('64f1a2b3c4d5e6f7a8b9c0ff'),
    );
    mockClinicProfessionalModel.findOne.mockReturnValue(execMock(null));

    await expect(
      service.getProviderSchedule(professionalId, query, currentUserId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow an attendant with a matching ClinicProfessional link', async () => {
    mockUserModel.findById.mockReturnValue(
      execMock(makeUser(Role.ATTENDANT, { clinicId })),
    );
    mockProfessionalsService.findById.mockResolvedValue(
      makeProfessional('64f1a2b3c4d5e6f7a8b9c0ff'),
    );
    mockClinicProfessionalModel.findOne.mockReturnValue(
      execMock({ clinicId, professionalId }),
    );

    const result = await service.getProviderSchedule(professionalId, query, currentUserId);

    expect(result.availableSlots).toEqual([]);
    expect(result.appointments).toEqual([]);
  });

  it('should throw ForbiddenException for patient role', async () => {
    mockUserModel.findById.mockReturnValue(execMock(makeUser(Role.PATIENT)));
    mockProfessionalsService.findById.mockResolvedValue(
      makeProfessional('64f1a2b3c4d5e6f7a8b9c0ff'),
    );

    await expect(
      service.getProviderSchedule(professionalId, query, currentUserId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should normalize toDate to end of day and pass correct args to services', async () => {
    mockUserModel.findById.mockReturnValue(execMock(makeUser(Role.PROFESSIONAL)));
    mockProfessionalsService.findById.mockResolvedValue(
      makeProfessional(currentUserId),
    );

    await service.getProviderSchedule(professionalId, query, currentUserId);

    const toDateCall = mockAvailabilityService.getAvailableSlots.mock.calls[0][1].toDate as Date;
    expect(toDateCall.getHours()).toBe(23);
    expect(toDateCall.getMinutes()).toBe(59);
    expect(toDateCall.getSeconds()).toBe(59);

    const appointmentsCallArgs = mockAppointmentsService.findAll.mock.calls[0][0];
    expect(appointmentsCallArgs.professionalId).toBe(professionalId);
    expect(appointmentsCallArgs.dateFrom).toBeDefined();
    expect(appointmentsCallArgs.dateTo).toBeDefined();
  });

  it('should throw BadRequestException when toDate is before fromDate', async () => {
    mockUserModel.findById.mockReturnValue(execMock(makeUser(Role.PROFESSIONAL)));
    mockProfessionalsService.findById.mockResolvedValue(
      makeProfessional(currentUserId),
    );

    await expect(
      service.getProviderSchedule(
        professionalId,
        { fromDate: '2024-01-07', toDate: '2024-01-01' },
        currentUserId,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
