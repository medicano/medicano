import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { UsersRepository } from './users.repository';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Role } from '../common/enums/role.enum';

interface CreateUserDto {
  role: Role;
  email?: string;
  username?: string;
  clinicId?: string;
  password: string;
  name?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async createUser(dto: CreateUserDto): Promise<UserDocument> {
    const { role, email, username, clinicId, password, name } = dto;

    if (role === Role.ATTENDANT) {
      if (!username) {
        throw new BadRequestException('Attendant requires username');
      }
      if (!clinicId) {
        throw new BadRequestException('Attendant requires clinicId');
      }
      if (email) {
        throw new BadRequestException('Attendant cannot have email');
      }
    }

    if (role !== Role.ATTENDANT) {
      if (!email) {
        throw new BadRequestException('Email is required');
      }
      if (username) {
        throw new BadRequestException('Username not allowed for this role');
      }
      if (clinicId) {
        throw new BadRequestException('ClinicId not allowed for this role');
      }
    }

    const passwordHash = await this.hashPassword(password);

    const userData: Partial<User> = {
      role,
      passwordHash,
      ...(email && { email }),
      ...(username && { username }),
      ...(clinicId && { clinicId: new Types.ObjectId(clinicId) }),
      ...(name && { displayName: name }),
    };

    try {
      return await this.usersRepository.create(userData);
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  async findByEmailAndRole(
    email: string,
    role: Role,
  ): Promise<UserDocument | null> {
    return this.usersRepository.findByEmailAndRole(email, role);
  }

  async findByClinicIdAndUsername(
    clinicId: string,
    username: string,
  ): Promise<UserDocument | null> {
    return this.usersRepository.findByClinicIdAndUsername(clinicId, username);
  }

  async getById(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
