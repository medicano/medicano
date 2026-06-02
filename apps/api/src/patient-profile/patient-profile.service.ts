import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PatientProfile,
  PatientProfileDocument,
} from './schemas/patient-profile.schema';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Injectable()
export class PatientProfileService {
  private readonly logger = new Logger(PatientProfileService.name);

  constructor(
    @InjectModel(PatientProfile.name)
    private readonly model: Model<PatientProfileDocument>,
  ) {}

  async findByUserId(userId: string): Promise<PatientProfileDocument | null> {
    const profile = await this.model.findOne({ userId }).exec();
    if (!profile) {
      this.logger.warn(`findByUserId userId=${userId} outcome=notFound`);
      return null;
    }
    this.logger.log(`findByUserId userId=${userId} outcome=success`);
    return profile;
  }

  async upsertForUser(
    userId: string,
    dto: UpdatePatientProfileDto,
  ): Promise<PatientProfileDocument | null> {
    try {
      await this.model
        .updateOne(
          { userId },
          {
            $set: { ...dto, lastReviewedAt: new Date() },
            $setOnInsert: { userId },
          },
          { upsert: true },
        )
        .exec();

      const profile = await this.model.findOne({ userId }).exec();
      this.logger.log(`upsertForUser userId=${userId} outcome=success`);
      return profile;
    } catch (err) {
      this.logger.error(`upsertForUser userId=${userId} outcome=fail`);
      throw err;
    }
  }

  async exportForUser(
    userId: string,
  ): Promise<{ profile: PatientProfileDocument | null; exportedAt: Date }> {
    const profile = await this.model.findOne({ userId }).exec();
    const exportedAt = new Date();
    this.logger.log(
      `exportForUser userId=${userId} outcome=${profile ? 'success' : 'notFound'}`,
    );
    return { profile, exportedAt };
  }

  async hardDeleteForUser(userId: string): Promise<{ deleted: boolean }> {
    const result = await this.model.deleteOne({ userId }).exec();
    const deleted = result.deletedCount > 0;
    this.logger.log(
      `hardDeleteForUser userId=${userId} outcome=${deleted ? 'success' : 'notFound'}`,
    );
    return { deleted };
  }

  async setUseInAssistant(
    userId: string,
    useInAssistant: boolean,
  ): Promise<PatientProfileDocument | null> {
    await this.model.updateOne({ userId }, { $set: { useInAssistant } }).exec();
    const profile = await this.model.findOne({ userId }).exec();
    this.logger.log(
      `setUseInAssistant userId=${userId} outcome=${profile ? 'success' : 'notFound'}`,
    );
    return profile;
  }
}
