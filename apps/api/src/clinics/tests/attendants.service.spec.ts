import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AttendantsService } from '../services/attendants.service';
import { ClinicsService } from '../clinics.service';
import { User } from '../../auth/schemas/user.schema';
import { Role } from '../../common/enums/role.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

// ---------------------------------------------------------------------------
// Constructor-function mock for the Mongoose User model (per CONVENTIONS.md).
// Supports both `new this.userModel(dto)` and static methods.
// ---------------------------------------------------------------------------
function MockUserModel(this: any, dto: any) {
  Object.assign(this, dto);
  this.save = jest.fn().mockResolvedValue(this);
  this.toObject = jest.fn().mockReturnValue({ ...dto });
}
(MockUserModel as any).find = jest.fn();
(MockUserModel as any).findOneAndUpdate = jest.fn();
(MockUserModel as any).create = jest.fn();
(MockUserModel as any).deleteOne = jest.fn();

// Query-chain helper (supports .select().sort().exec() in any order).
function buildExec<T>(value: T) {
  const chain: any = {
    exec: jest.fn().mockResolvedValue(value),
    select: jest.fn(),
    sort: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  return chain;
}

describe('AttendantsService', () => {
  let service: AttendantsService;

  const currentUserId = new Types.ObjectId().toString();
  const clinicId = new Types.ObjectId().toString();
  const attendantId = new Types.ObjectId().toString();

  const ownedClinic = { _id: clinicId, userId: currentUserId };
  const foreignClinic = { _id: clinicId, userId: 'other-user-id' };

  const mockClinicsService = { findById: jest.fn() };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AttendantsService,
        { provide: getModelToken(User.name), useValue: MockUserModel },
        { provide: ClinicsService, useValue: mockClinicsService },
      ],
    }).compile();

    service = moduleRef.get(AttendantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // createAttendant
  // -------------------------------------------------------------------------
  describe('createAttendant', () => {
    const dto = {
      username: 'ana.attendant',
      password: 'plain-pass',
      displayName: 'Ana',
    } as any;

    it('creates user with hashed password and role ATTENDANT', async () => {
      mockClinicsService.findById.mockResolvedValue(ownedClinic);

      const createdDoc = {
        _id: attendantId,
        username: dto.username,
        displayName: dto.displayName,
        role: Role.ATTENDANT,
        clinicId,
        passwordHash: 'hashed-password',
        toObject() {
          return {
            _id: attendantId,
            username: dto.username,
            displayName: dto.displayName,
            role: Role.ATTENDANT,
            clinicId,
            passwordHash: 'hashed-password',
          };
        },
      };
      (MockUserModel as any).create.mockResolvedValue(createdDoc);

      const result = await service.createAttendant(
        currentUserId,
        clinicId,
        dto,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect((MockUserModel as any).create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: Role.ATTENDANT,
          clinicId,
          passwordHash: 'hashed-password',
          username: dto.username,
          displayName: dto.displayName,
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws ConflictException on duplicate username', async () => {
      mockClinicsService.findById.mockResolvedValue(ownedClinic);
      (MockUserModel as any).create.mockRejectedValue({ code: 11000 });

      await expect(
        service.createAttendant(currentUserId, clinicId, dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ForbiddenException when current user does not own the clinic', async () => {
      mockClinicsService.findById.mockResolvedValue(foreignClinic);

      await expect(
        service.createAttendant(currentUserId, clinicId, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect((MockUserModel as any).create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // listAttendants
  // -------------------------------------------------------------------------
  describe('listAttendants', () => {
    it('returns attendants of that clinic sorted by displayName, no passwordHash', async () => {
      mockClinicsService.findById.mockResolvedValue(ownedClinic);

      const docs = [{ displayName: 'Ana' }, { displayName: 'Bruno' }];
      const chain = buildExec(docs);
      (MockUserModel as any).find.mockReturnValue(chain);

      const result = await service.listAttendants(currentUserId, clinicId);

      expect((MockUserModel as any).find).toHaveBeenCalledWith({
        role: Role.ATTENDANT,
        clinicId,
      });
      expect(chain.select).toHaveBeenCalledWith('-passwordHash');
      expect(chain.sort).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: expect.anything() }),
      );
      expect(result).toEqual(docs);
    });

    it('throws ForbiddenException when current user does not own the clinic', async () => {
      mockClinicsService.findById.mockResolvedValue(foreignClinic);

      await expect(
        service.listAttendants(currentUserId, clinicId),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect((MockUserModel as any).find).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // updateAttendant
  // -------------------------------------------------------------------------
  describe('updateAttendant', () => {
    it('updates displayName and isActive', async () => {
      mockClinicsService.findById.mockResolvedValue(ownedClinic);

      const updatedDoc = { displayName: 'Updated', isActive: false };
      const chain = buildExec(updatedDoc);
      (MockUserModel as any).findOneAndUpdate.mockReturnValue(chain);

      const dto = { displayName: 'Updated', isActive: false } as any;
      const result = await service.updateAttendant(
        currentUserId,
        clinicId,
        attendantId,
        dto,
      );

      expect((MockUserModel as any).findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: attendantId,
          role: Role.ATTENDANT,
          clinicId,
        }),
        expect.objectContaining({
          displayName: 'Updated',
          isActive: false,
        }),
        expect.any(Object),
      );
      expect(result).toEqual(updatedDoc);
    });

    it('rehashes password when dto.password is provided', async () => {
      mockClinicsService.findById.mockResolvedValue(ownedClinic);

      const chain = buildExec({ displayName: 'x' });
      (MockUserModel as any).findOneAndUpdate.mockReturnValue(chain);

      const dto = { password: 'new-pass' } as any;
      await service.updateAttendant(
        currentUserId,
        clinicId,
        attendantId,
        dto,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('new-pass', 12);

      const updateArg = (MockUserModel as any).findOneAndUpdate.mock.calls[0][1];
      expect(updateArg).toEqual(
        expect.objectContaining({ passwordHash: 'hashed-password' }),
      );
    });

    it('does NOT call bcrypt.hash when dto.password is not provided', async () => {
      mockClinicsService.findById.mockResolvedValue(ownedClinic);

      const chain = buildExec({ displayName: 'x' });
      (MockUserModel as any).findOneAndUpdate.mockReturnValue(chain);

      const dto = { displayName: 'Only name' } as any;
      await service.updateAttendant(
        currentUserId,
        clinicId,
        attendantId,
        dto,
      );

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // removeAttendant
  // -------------------------------------------------------------------------
  describe('removeAttendant', () => {
    it('returns { success: true } on success', async () => {
      mockClinicsService.findById.mockResolvedValue(ownedClinic);
      (MockUserModel as any).deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.removeAttendant(
        currentUserId,
        clinicId,
        attendantId,
      );

      expect(result).toEqual({ success: true });
      expect((MockUserModel as any).deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: attendantId,
          role: Role.ATTENDANT,
          clinicId,
        }),
      );
    });

    it('throws NotFoundException when attendant not found', async () => {
      mockClinicsService.findById.mockResolvedValue(ownedClinic);
      (MockUserModel as any).deleteOne.mockResolvedValue({ deletedCount: 0 });

      await expect(
        service.removeAttendant(currentUserId, clinicId, attendantId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
