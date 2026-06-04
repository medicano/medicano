import { Body, Controller, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService, AuthResponse, AuthUser } from './auth.service';
import { LoginAttendantDto } from './dto/login-attendant.dto';
import { LoginStandardDto } from './dto/login-standard.dto';
import { SignupDto } from './dto/signup.dto';
import {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  buildAuthCookieClearOptions,
} from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // O token vai no cookie httpOnly (nunca no corpo) — o JS do front não o lê.
  // A resposta devolve apenas os dados do usuário.
  private issueSession(response: Response, auth: AuthResponse): { user: AuthUser } {
    response.cookie(AUTH_COOKIE_NAME, auth.accessToken, buildAuthCookieOptions());
    return { user: auth.user };
  }

  @Post('signup')
  @HttpCode(201)
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    return this.issueSession(response, await this.authService.signup(dto));
  }

  @Post('login')
  @HttpCode(200)
  async loginStandard(
    @Body() dto: LoginStandardDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    return this.issueSession(response, await this.authService.loginStandard(dto));
  }

  @Post('login/attendant')
  @HttpCode(200)
  async loginAttendant(
    @Body() dto: LoginAttendantDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    return this.issueSession(response, await this.authService.loginAttendant(dto));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logout(
    @CurrentUser() userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(userId);
    response.clearCookie(AUTH_COOKIE_NAME, buildAuthCookieClearOptions());
  }
}
