import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ClinicsService } from '../clinics.service';
import { Clinic, ClinicDocument } from '../schemas/clinic.schema';

// RF49 — endpoint dedicado (em vez de passar por ClinicsService.update()) por
// decisão deliberada: o update() genérico faz Object.assign(clinic, dto) com
// uma instância de DTO e revalida o documento inteiro no save(), e há um bug
// conhecido não resolvido nesse caminho (ver conversa/registro da sprint —
// PATCH /clinics/:id pode falhar com "Path `name` is required" mesmo sem
// enviar `name`). Este service só mexe no campo healthInsurances diretamente,
// mesmo padrão já usado e verificado em ClinicUnitsService/ClinicPhotosService.
@Injectable()
export class ClinicHealthInsurancesService {
  constructor(
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
    private readonly clinicsService: ClinicsService,
  ) {}

  async update(clinicId: string, userId: string, healthInsurances: string[]): Promise<string[]> {
    const clinic = await this.clinicsService.findOne(clinicId);
    if (clinic.userId.toString() !== userId) {
      throw new ForbiddenException('Você não é o responsável por este estabelecimento');
    }
    clinic.healthInsurances = healthInsurances;
    await clinic.save();
    return clinic.healthInsurances;
  }
}
