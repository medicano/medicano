import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { unlink } from 'fs/promises';
import { join } from 'path';

import { ClinicsService } from '../clinics.service';
import { Clinic, ClinicDocument } from '../schemas/clinic.schema';

const MAX_PHOTOS_PER_CLINIC = 12;

@Injectable()
export class ClinicPhotosService {
  constructor(
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
    private readonly clinicsService: ClinicsService,
  ) {}

  private async assertOwnership(clinicId: string, userId: string): Promise<ClinicDocument> {
    const clinic = await this.clinicsService.findOne(clinicId);
    if (clinic.userId.toString() !== userId) {
      throw new ForbiddenException('Você não é o responsável por este estabelecimento');
    }
    return clinic;
  }

  // O caminho salvo no banco é sempre relativo à raiz pública (/uploads/...),
  // nunca o caminho absoluto em disco — o absoluto muda por ambiente.
  async addPhoto(clinicId: string, userId: string, publicPath: string): Promise<string[]> {
    const clinic = await this.assertOwnership(clinicId, userId);
    if (clinic.photos.length >= MAX_PHOTOS_PER_CLINIC) {
      throw new BadRequestException(
        `Limite de ${MAX_PHOTOS_PER_CLINIC} fotos por clínica atingido`,
      );
    }
    clinic.photos.push(publicPath);
    await clinic.save();
    return clinic.photos;
  }

  async removePhoto(clinicId: string, userId: string, publicPath: string): Promise<string[]> {
    const clinic = await this.assertOwnership(clinicId, userId);
    if (!clinic.photos.includes(publicPath)) {
      throw new NotFoundException('Foto não encontrada');
    }
    clinic.photos = clinic.photos.filter((p) => p !== publicPath);
    await clinic.save();

    // Best-effort: remover o arquivo físico não pode derrubar a resposta —
    // o registro no banco já é a fonte de verdade do que está "visível".
    try {
      const relativePath = publicPath.replace(/^\/uploads\//, '');
      await unlink(join(process.cwd(), 'uploads', relativePath));
    } catch {
      // arquivo pode já não existir; sem problema
    }

    return clinic.photos;
  }
}
