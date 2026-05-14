import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ChatService } from './chat.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { GetChatMessagesQueryDto } from './dto/get-chat-messages-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  async createSession(
    @Req() req: Express.Request,
    @Body() dto: CreateChatSessionDto,
  ) {
    return this.chatService.createSession((req.user as any).userId, dto);
  }

  @Get('sessions')
  async listSessions(@Req() req: Express.Request) {
    return this.chatService.listSessions((req.user as any).userId);
  }

  @Get('sessions/:sessionId/messages')
  async listMessages(
    @Req() req: Express.Request,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Query() query: GetChatMessagesQueryDto,
  ) {
    return this.chatService.listMessages(
      (req.user as any).userId,
      sessionId,
      query,
    );
  }

  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Body() dto: CreateChatMessageDto,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const streamResponse = await this.chatService.sendMessage(sessionId, dto);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!streamResponse.body) {
      res.end();
      return;
    }

    const reader = streamResponse.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        res.write(value);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  }
}
