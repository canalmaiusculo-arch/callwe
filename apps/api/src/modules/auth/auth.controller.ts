import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';

const LoginDto = z.object({ email: z.string().email(), password: z.string().min(8) });
const RegisterDto = LoginDto.extend({ fullName: z.string().min(2) });
const RefreshDto = z.object({ refreshToken: z.string() });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@ZodBody(RegisterDto) dto: z.infer<typeof RegisterDto>) {
    return this.auth.register(dto);
  }

  @Post('login')
  async login(@ZodBody(LoginDto) dto: z.infer<typeof LoginDto>, @Req() req: Request) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    return this.auth.issueTokens(user, { ip: req.ip, ua: req.headers['user-agent'] });
  }

  @Post('refresh')
  refresh(@ZodBody(RefreshDto) dto: z.infer<typeof RefreshDto>) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@ZodBody(RefreshDto) dto: z.infer<typeof RefreshDto>) {
    await this.auth.revoke(dto.refreshToken);
    return { ok: true };
  }
}
