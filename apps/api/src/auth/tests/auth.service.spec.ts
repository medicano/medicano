import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { Role } from '../../common/enums/role.enum';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    createUser: jest.fn(),
    findByEmailAndRole: jest.fn(),
    findByClinicIdAndUsername: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
  };

  const redisService = {
    saveToken: jest.fn(),
    removeToken: jest.fn(),
  };

  const TOKEN_TTL = 7 * 24 * 3600;

  beforeEach(() => {
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      redisService as unknown as RedisService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto = {
      email: 'patient@example.com',
      password: 'StrongPassword123!',
      role: Role.PATIENT,
      name: 'Patient Name',
    } as any;

    it('should create user, sign JWT, save token, and return access token', async () => {
      const createdUser = {
        _id: { toString: () => 'user-id-1' },
        email: signupDto.email,
        role: Role.PATIENT,
      };
      usersService.createUser.mockResolvedValue(createdUser);
      jwtService.sign.mockReturnValue('signed.jwt.token');
      redisService.saveToken.mockResolvedValue(undefined);

      const result = await service.signup(signupDto);

      expect(usersService.createUser).toHaveBeenCalledWith(signupDto);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id-1',
        role: Role.PATIENT,
      });
      expect(redisService.saveToken).toHaveBeenCalledWith(
        'user-id-1',
        'signed.jwt.token',
        TOKEN_TTL,
      );
      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    });

    it('should propagate ConflictException when user already exists', async () => {
      usersService.createUser.mockRejectedValue(
        new ConflictException('User already exists'),
      );

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(redisService.saveToken).not.toHaveBeenCalled();
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
      usersService.findByEmailAndRole.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('access-token');
      redisService.saveToken.mockResolvedValue(undefined);

      const result = await service.loginStandard(loginDto);

      expect(usersService.findByEmailAndRole).toHaveBeenCalledWith(
        loginDto.email,
        Role.PATIENT,
      );
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
      expect(result).toEqual({ accessToken: 'access-token' });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findByEmailAndRole.mockResolvedValue(null);

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
      usersService.findByEmailAndRole.mockResolvedValue(mockUser);

      await expect(service.loginStandard(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(redisService.saveToken).not.toHaveBeenCalled();
    });
  });

  describe('loginAttendant', () => {
    const attendantDto = {
      clinicId: 'clinic-id-1',
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
      expect(result).toEqual({ accessToken: 'attendant-access-token' });
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
