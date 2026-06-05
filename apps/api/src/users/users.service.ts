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
        throw new BadRequestException('Atendente precisa de nome de usuário');
      }
      if (!clinicId) {
        throw new BadRequestException('Atendente precisa de um estabelecimento vinculado');
      }
      if (email) {
        throw new BadRequestException('Atendente não pode ter email');
      }
    }

    if (role !== Role.ATTENDANT) {
      if (!email) {
        throw new BadRequestException('Email é obrigatório');
      }
      if (username) {
        throw new BadRequestException('Nome de usuário não permitido para este perfil');
      }
      if (clinicId) {
        throw new BadRequestException('Estabelecimento não permitido para este perfil');
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
        throw new ConflictException('Usuário já cadastrado');
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmail(email);
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

  async findByProfessionalIdAndUsername(
    professionalId: string,
    username: string,
  ): Promise<UserDocument | null> {
    return this.usersRepository.findByProfessionalIdAndUsername(
      professionalId,
      username,
    );
  }

  async getById(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async deleteById(id: string): Promise<void> {
    await this.usersRepository.deleteById(id);
  }
}
