import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findByEmailAndRole(
    email: string,
    role: Role,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, role }).select('+passwordHash').exec();
  }

  async findByClinicIdAndUsername(
    clinicId: string,
    username: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ clinicId, username })
      .select('+passwordHash')
      .exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }
}
