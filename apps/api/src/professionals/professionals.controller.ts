import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
@UseGuards(JwtAuthGuard)
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() createProfessionalDto: CreateProfessionalDto,
  ) {
    return this.professionalsService.create(userId, createProfessionalDto);
  }

  @Get()
  async findAll() {
    return this.professionalsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.professionalsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(id, updateProfessionalDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.professionalsService.remove(id);
  }
}
