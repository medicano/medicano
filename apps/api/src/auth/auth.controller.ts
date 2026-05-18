import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService, AuthResponse } from './auth.service';
import { LoginAttendantDto } from './dto/login-attendant.dto';
import { LoginStandardDto } from './dto/login-standard.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(201)
  async signup(@Body() dto: SignupDto): Promise<AuthResponse> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  async loginStandard(@Body() dto: LoginStandardDto): Promise<AuthResponse> {
    return this.authService.loginStandard(dto);
  }

  @Post('login/attendant')
  @HttpCode(200)
  async loginAttendant(@Body() dto: LoginAttendantDto): Promise<AuthResponse> {
    return this.authService.loginAttendant(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logout(@CurrentUser() userId: string): Promise<void> {
    await this.authService.logout(userId);
  }
}
