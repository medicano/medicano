import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import {
  Professional,
  ProfessionalSchema,
} from './schemas/professional.schema';
import {
  ClinicProfessional,
  ClinicProfessionalSchema,
} from './schemas/clinic-professional.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Professional.name, schema: ProfessionalSchema },
      { name: ClinicProfessional.name, schema: ClinicProfessionalSchema },
    ]),
  ],
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
