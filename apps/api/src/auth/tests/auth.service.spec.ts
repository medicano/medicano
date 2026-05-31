import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { Role } from '../../common/enums/role.enum';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    createUser: jest.fn(),
    findByEmail: jest.fn(),
    findByClinicIdAndUsername: jest.fn(),
    deleteById: jest.fn().mockResolvedValue(undefined),
  };

  const jwtService = {
    sign: jest.fn(),
  };

  const redisService = {
    saveToken: jest.fn(),
    removeToken: jest.fn(),
  };

  const subscriptionsService = {
    create: jest.fn(),
  };

  const patientModel = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const clinicModel = {
    create: jest.fn(),
    findOne: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) }),
    deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
  };

  const professionalModel = {
    create: jest.fn(),
  };

  const TOKEN_TTL = 7 * 24 * 3600;

  beforeEach(() => {
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      redisService as unknown as RedisService,
      subscriptionsService as any,
      patientModel as any,
      clinicModel as any,
      professionalModel as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    describe('role=patient', () => {
      const patientDto = {
        email: 'marina@example.com',
        password: 'StrongPassword123!',
        role: Role.PATIENT,
        name: 'Marina Souza',
        dateOfBirth: '1995-03-15',
        phone: '+5511987654321',
      } as any;

      const createdUser = {
        _id: { toString: () => 'user-id-1' },
        email: patientDto.email,
        role: Role.PATIENT,
      };

      it('should create User and Patient documents and return access token', async () => {
        usersService.createUser.mockResolvedValue(createdUser);
        jwtService.sign.mockReturnValue('signed.jwt.token');
        redisService.saveToken.mockResolvedValue(undefined);
        patientModel.create.mockResolvedValue({});

        const result = await service.signup(patientDto);

        expect(usersService.createUser).toHaveBeenCalledWith(patientDto);
        expect(patientModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-id-1',
            name: patientDto.name,
            phone: '5511987654321',
          }),
        );
        expect(result).toMatchObject({ accessToken: 'signed.jwt.token' });
      });

      it('should normalise phone by stripping non-digit characters', async () => {
        usersService.createUser.mockResolvedValue(createdUser);
        jwtService.sign.mockReturnValue('token');
        redisService.saveToken.mockResolvedValue(undefined);
        patientModel.create.mockResolvedValue({});

        await service.signup({ ...patientDto, phone: '+55 (11) 98765-4321' });

        expect(patientModel.create).toHaveBeenCalledWith(
          expect.objectContaining({ phone: '5511987654321' }),
        );
      });

      it('should throw BadRequestException for a future dateOfBirth', async () => {
        usersService.createUser.mockResolvedValue(createdUser);

        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        await expect(
          service.signup({ ...patientDto, dateOfBirth: futureDate.toISOString().slice(0, 10) }),
        ).rejects.toThrow(BadRequestException);

        expect(patientModel.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException for dateOfBirth older than 120 years', async () => {
        usersService.createUser.mockResolvedValue(createdUser);

        await expect(
          service.signup({ ...patientDto, dateOfBirth: '1850-01-01' }),
        ).rejects.toThrow(BadRequestException);

        expect(patientModel.create).not.toHaveBeenCalled();
      });

      it('should propagate ConflictException when user already exists', async () => {
        usersService.createUser.mockRejectedValue(
          new ConflictException('User already exists'),
        );

        await expect(service.signup(patientDto)).rejects.toThrow(ConflictException);
        expect(patientModel.create).not.toHaveBeenCalled();
        expect(jwtService.sign).not.toHaveBeenCalled();
      });
    });

    describe('role=clinic', () => {
      const clinicDto = {
        email: 'clinic@example.com',
        password: 'StrongPassword123!',
        role: Role.CLINIC,
        name: 'Clínica Teste',
      } as any;

      it('should create User but not Patient document', async () => {
        const createdUser = {
          _id: { toString: () => 'clinic-id-1' },
          email: clinicDto.email,
          role: Role.CLINIC,
        };
        usersService.createUser.mockResolvedValue(createdUser);
        clinicModel.create.mockResolvedValue({ _id: { toString: () => 'clinic-doc-id' } });
        subscriptionsService.create.mockResolvedValue(undefined);
        jwtService.sign.mockReturnValue('clinic.token');
        redisService.saveToken.mockResolvedValue(undefined);

        await service.signup(clinicDto);

        expect(patientModel.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('loginStandard', () => {
    const loginDto = {
      email: 'patient@example.com',
      password: 'StrongPassword123!',
    };

    it('should find user by patient role, verify password, sign token, and store in redis', async () => {
      const mockUser = {
        _id: { toString: () => 'user-id-1' },
        email: loginDto.email,
        role: Role.PATIENT,
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      usersService.findByEmail.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('access-token');
      redisService.saveToken.mockResolvedValue(undefined);

      const result = await service.loginStandard(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockUser.comparePassword).toHaveBeenCalledWith(loginDto.password);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id-1',
        role: Role.PATIENT,
      });
      expect(redisService.saveToken).toHaveBeenCalledWith(
        'user-id-1',
        'access-token',
        TOKEN_TTL,
      );
      expect(result).toMatchObject({ accessToken: 'access-token' });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.loginStandard(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(redisService.saveToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockUser = {
        _id: { toString: () => 'user-id-1' },
        role: Role.PATIENT,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.loginStandard(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(redisService.saveToken).not.toHaveBeenCalled();
    });
  });

  describe('loginAttendant', () => {
    const attendantDto = {
      clinicId: '507f1f77bcf86cd799439011',
      username: 'frontdesk',
      password: 'StrongPassword123!',
    };

    it('should find attendant by clinic and username, verify password, and return token', async () => {
      const mockAttendant = {
        _id: { toString: () => 'attendant-id-1' },
        username: 'frontdesk',
        clinicId: 'clinic-id-1',
        role: Role.ATTENDANT,
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      usersService.findByClinicIdAndUsername.mockResolvedValue(mockAttendant);
      jwtService.sign.mockReturnValue('attendant-access-token');
      redisService.saveToken.mockResolvedValue(undefined);

      const result = await service.loginAttendant(attendantDto);

      expect(usersService.findByClinicIdAndUsername).toHaveBeenCalledWith(
        attendantDto.clinicId,
        attendantDto.username,
      );
      expect(mockAttendant.comparePassword).toHaveBeenCalledWith(
        attendantDto.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'attendant-id-1',
        role: Role.ATTENDANT,
      });
      expect(redisService.saveToken).toHaveBeenCalledWith(
        'attendant-id-1',
        'attendant-access-token',
        TOKEN_TTL,
      );
      expect(result).toMatchObject({ accessToken: 'attendant-access-token' });
    });

    it('should throw UnauthorizedException when attendant not found', async () => {
      usersService.findByClinicIdAndUsername.mockResolvedValue(null);

      await expect(service.loginAttendant(attendantDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(redisService.saveToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockAttendant = {
        _id: { toString: () => 'attendant-id-1' },
        role: Role.ATTENDANT,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      usersService.findByClinicIdAndUsername.mockResolvedValue(mockAttendant);

      await expect(service.loginAttendant(attendantDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(redisService.saveToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should remove the token from redis for the given userId', async () => {
      redisService.removeToken.mockResolvedValue(undefined);

      await service.logout('user-id-1');

      expect(redisService.removeToken).toHaveBeenCalledWith('user-id-1');
    });
  });
});
