import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { ActivityLog, ActivityLogDocument } from './schemas/activity-log.schema';
import { ActivityAction } from './enums/activity-action.enum';

interface RecordParams {
  clinicId?: string;
  professionalId?: string;
  actorUserId: string;
  actorDisplayName: string;
  action: ActivityAction;
  description: string;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  // Nunca lança — mesmo padrão do NotificationsService: registrar histórico é
  // auxiliar, uma falha aqui não pode derrubar a operação principal (ex.: criar
  // um atendente não pode falhar porque o log deu erro).
  async record(params: RecordParams): Promise<void> {
    try {
      await this.activityLogModel.create({
        clinicId: params.clinicId,
        professionalId: params.professionalId,
        actorUserId: params.actorUserId,
        actorDisplayName: params.actorDisplayName,
        action: params.action,
        description: params.description,
      });
    } catch (err) {
      this.logger.warn(`record: failed to persist activity log — ${(err as Error).message}`);
    }
  }

  async listByClinic(clinicId: string, limit = 50): Promise<ActivityLogDocument[]> {
    if (!Types.ObjectId.isValid(clinicId)) return [];
    return this.activityLogModel
      .find({ clinicId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async listByProfessional(professionalId: string, limit = 50): Promise<ActivityLogDocument[]> {
    if (!Types.ObjectId.isValid(professionalId)) return [];
    return this.activityLogModel
      .find({ professionalId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
