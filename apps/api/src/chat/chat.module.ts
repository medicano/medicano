import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSession, ChatSessionSchema } from './schemas/chat-session.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { ANTHROPIC_MODEL } from './constants/chat.tokens';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    ConfigModule,
    PatientsModule,
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: ANTHROPIC_MODEL,
      useFactory: (configService: ConfigService) => {
        const anthropic = createAnthropic({
          apiKey: configService.get<string>('ANTHROPIC_API_KEY') ?? '',
        });
        return anthropic('claude-sonnet-4-6');
      },
      inject: [ConfigService],
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
