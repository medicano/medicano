import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import {
  Professional,
  ProfessionalSchema,
} from './schemas/professional.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Professional.name,
        schema: ProfessionalSchema,
      },
    ]),
  ],
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService],
  exports: [ProfessionalsService, MongooseModule],
})
export class ProfessionalsModule {}
