import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';

import { AttendantsService } from '../services/attendants.service';
import { ClinicsService } from '../clinics.service';
import { User } from '../../auth/schemas/user.schema';
import { Role } from '../../common/enums/role.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

const mockQuery = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('AttendantsService', () => {
  let service: AttendantsService;

  const userModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };

  const clinicsService = {
    findByOwner: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdForOwner: jest.fn(),
    getClinicByOwner: jest.fn(),
  };

  const ownerId = 'clinic-owner-id';
  const anotherOwnerId = 'another-owner-id';
  const clinicId = 'clinic-id';
  const attendantId = 'attendant-id';

  const clinic = {
    _id: clinicId,
    userId: ownerId,
    ownerId,
    toString: () => clinicId,
  };

  const clinicOwnedByAnother = {
    _id: clinicId,
    userId: anotherOwnerId,
    ownerId: anotherOwnerId,
    toString: () => clinicId,
  };

  const mockClinicOwnership = (owned: boolean) => {
    const value = owned ? clinic : clinicOwnedByAnother;
    const nullValue = owned ? clinic : null;

    Object.keys(clinicsService).forEach((key) => {
      const fn = clinicsService[
        key as keyof typeof clinicsService
      ] as jest.Mock;

      if (key === 'findByOwner' || key === 'findByIdForOwner' ||
          key === 'getClinicByOwner') {
        fn.mockResolvedValue(nullValue);
      } else {
        fn.mockResolvedValue(value);
      }
    });
  };

  beforeEach(async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendantsService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: ClinicsService,
          useValue: clinicsService,
        },
      ],
    }).compile();

    service = module.get<AttendantsService>(AttendantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAttendant', () => {
    const dto = {
      username: 'attendant@example.com',
      password: 'plain-password',
      displayName: 'Attendant Name',
    };

    it('createAttendant — success hashes password and creates user with role=ATTENDANT', async () => {
      mockClinicOwnership(true);

      const createdUser = {
        _id: attendantId,
        username: dto.username,
        displayName: dto.displayName,
        role: Role.ATTENDANT,
        clinicId,
      };

      userModel.create.mockResolvedValue(createdUser);

      const result = await service.createAttendant(ownerId, clinicId, dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        dto.password,
        expect.any(Number),
      );

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: dto.username,
          displayName: dto.displayName,
          passwordHash: 'hashed-password',
          role: Role.ATTENDANT,
        }),
      );

      const createArg = userModel.create.mock.calls[0][0];
      expect(createArg).not.toHaveProperty('password');

      expect(result).toEqual(createdUser);
    });

    it('createAttendant — duplicate username throws ConflictException', async () => {
      mockClinicOwnership(true);

      userModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.createAttendant(ownerId, clinicId, dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('createAttendant — clinic owned by another user throws ForbiddenException', async () => {
      mockClinicOwnership(false);

      await expect(
        service.createAttendant(ownerId, clinicId, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userModel.create).not.toHaveBeenCalled();
    });
  });

  describe('listAttendants', () => {
    it('listAttendants — returns only attendants of that clinic, no passwordHash, sorted by displayName', async () => {
      mockClinicOwnership(true);

      const attendants = [
        {
          _id: 'attendant-a',
          username: 'a@example.com',
          displayName: 'Ana',
          role: Role.ATTENDANT,
          clinicId,
        },
        {
          _id: 'attendant-b',
          username: 'b@example.com',
          displayName: 'Bruno',
          role: Role.ATTENDANT,
          clinicId,
        },
      ];

      const execMock = jest.fn().mockResolvedValue(attendants);
      const sortMock = jest.fn().mockReturnValue({ exec: execMock });
      const selectMock = jest
        .fn()
        .mockReturnValue({ sort: sortMock, exec: execMock });

      userModel.find.mockReturnValue({
        select: selectMock,
        sort: sortMock,
        exec: execMock,
      });

      const result = await service.listAttendants(ownerId, clinicId);

      expect(userModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId,
          role: Role.ATTENDANT,
        }),
      );

      expect(selectMock).toHaveBeenCalledWith('-passwordHash');
      expect(sortMock).toHaveBeenCalledWith({ displayName: 1 });
      expect(result).toEqual(attendants);
    });

    it('listAttendants — wrong clinic owner throws ForbiddenException', async () => {
      mockClinicOwnership(false);

      await expect(
        service.listAttendants(ownerId, clinicId),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(userModel.find).not.toHaveBeenCalled();
    });
  });

  describe('updateAttendant', () => {
    it('updateAttendant — wrong clinic throws NotFoundException', async () => {
      mockClinicOwnership(true);

      userModel.findOneAndUpdate.mockReturnValue(mockQuery(null));

      await expect(
        service.updateAttendant(ownerId, clinicId, attendantId, {
          displayName: 'Updated Name',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: attendantId,
          clinicId,
          role: Role.ATTENDANT,
        }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('updateAttendant — password rehashed when provided', async () => {
      mockClinicOwnership(true);

      const dto = {
        displayName: 'Updated Name',
        password: 'new-password',
      };

      const updatedUser = {
        _id: attendantId,
        username: 'attendant@example.com',
        displayName: dto.displayName,
        role: Role.ATTENDANT,
        clinicId,
      };

      userModel.findOneAndUpdate.mockReturnValue(mockQuery(updatedUser));

      const result = await service.updateAttendant(
        ownerId,
        clinicId,
        attendantId,
        dto,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(
        dto.password,
        expect.any(Number),
      );

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: attendantId,
          clinicId,
          role: Role.ATTENDANT,
        }),
        expect.objectContaining({
          displayName: dto.displayName,
          passwordHash: 'hashed-password',
        }),
        expect.any(Object),
      );

      const updateArg = userModel.findOneAndUpdate.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('password');

      expect(result).toEqual(updatedUser);
    });

    it('updateAttendant — password NOT rehashed when not provided', async () => {
      mockClinicOwnership(true);

      const dto = {
        displayName: 'Updated Name',
      };

      const updatedUser = {
        _id: attendantId,
        username: 'attendant@example.com',
        displayName: dto.displayName,
        role: Role.ATTENDANT,
        clinicId,
      };

      userModel.findOneAndUpdate.mockReturnValue(mockQuery(updatedUser));

      const result = await service.updateAttendant(
        ownerId,
        clinicId,
        attendantId,
        dto,
      );

      expect(bcrypt.hash).not.toHaveBeenCalled();

      const updateArg = userModel.findOneAndUpdate.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('passwordHash');
      expect(updateArg).toEqual(expect.objectContaining(dto));

      expect(result).toEqual(updatedUser);
    });
  });

  describe('removeAttendant', () => {
    it('removeAttendant — success returns { success: true }', async () => {
      mockClinicOwnership(true);

      userModel.deleteOne.mockReturnValue(mockQuery({ deletedCount: 1 }));

      const result = await service.removeAttendant(
        ownerId,
        clinicId,
        attendantId,
      );

      expect(userModel.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: attendantId,
          clinicId,
          role: Role.ATTENDANT,
        }),
      );

      expect(result).toEqual({ success: true });
    });

    it('removeAttendant — non-existent throws NotFoundException', async () => {
      mockClinicOwnership(true);

      userModel.deleteOne.mockReturnValue(mockQuery({ deletedCount: 0 }));

      await expect(
        service.removeAttendant(ownerId, clinicId, attendantId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
