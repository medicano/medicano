import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSession, ChatSessionSchema } from './schemas/chat-session.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    ConfigModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: Anthropic,
      useFactory: (configService: ConfigService) =>
        new Anthropic({ apiKey: configService.get<string>('ANTHROPIC_API_KEY') }),
      inject: [ConfigService],
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
