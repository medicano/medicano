import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionDocument } from './schemas/subscription.schema';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(RolesGuard)
  @Post()
  async create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseMongoIdPipe) id: string,
  ): Promise<SubscriptionDocument> {
    return this.subscriptionsService.findById(id);
  }

  @Get('clinic/:clinicId')
  async findByClinicId(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionsService.findByClinicId(clinicId);
  }

  @UseGuards(RolesGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @UseGuards(RolesGuard)
  @Delete(':id')
  async cancel(
    @Param('id', ParseMongoIdPipe) id: string,
  ): Promise<SubscriptionDocument> {
    return this.subscriptionsService.cancel(id);
  }
}
