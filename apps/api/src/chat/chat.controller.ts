import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response as ExpressResponse } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CHAT_MESSAGE_THROTTLE, CHAT_SESSION_THROTTLE } from '../common/throttle/throttle-limits';
import { ChatService } from './chat.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { GetChatMessagesQueryDto } from './dto/get-chat-messages-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  @Throttle(CHAT_SESSION_THROTTLE)
  async createSession(
    @CurrentUser() userId: string,
    @Body() dto: CreateChatSessionDto,
  ) {
    return this.chatService.createSession(userId, dto);
  }

  @Get('sessions')
  async listSessions(@CurrentUser() userId: string) {
    return this.chatService.listSessions(userId);
  }

  @Get('sessions/:sessionId')
  async getSession(
    @CurrentUser() userId: string,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
  ) {
    return this.chatService.getSession(sessionId, userId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @CurrentUser() userId: string,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
  ): Promise<void> {
    await this.chatService.deleteSession(sessionId, userId);
  }

  @Get('sessions/:sessionId/messages')
  async listMessages(
    @CurrentUser() userId: string,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Query() _query: GetChatMessagesQueryDto,
  ) {
    return this.chatService.listMessages(sessionId, userId);
  }

  @Post('sessions/:sessionId/messages')
  @Throttle(CHAT_MESSAGE_THROTTLE)
  async sendMessage(
    @CurrentUser() userId: string,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Body() dto: CreateChatMessageDto,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const streamResponse = await this.chatService.sendMessage(sessionId, userId, dto);

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
