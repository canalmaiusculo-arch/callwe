import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';

const LoginDto = z.object({ email: z.string().email(), password: z.string().min(8) });
const RegisterDto = LoginDto.extend({ fullName: z.string().min(2) });
const RefreshDto = z.object({ refreshToken: z.string() });
const ForgotDto = z.object({ email: z.string().email() });
const ResetDto = z.object({ token: z.string(), password: z.string().min(8) });

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

  /** Solicitar reset de senha — retorna sempre ok (não vaza existência do email). */
  @Post('forgot-password')
  forgot(@ZodBody(ForgotDto) dto: z.infer<typeof ForgotDto>) {
    return this.auth.requestPasswordReset(dto.email);
  }

  /** Troca senha usando o token gerado em /forgot-password. */
  @Post('reset-password')
  reset(@ZodBody(ResetDto) dto: z.infer<typeof ResetDto>) {
    return this.auth.resetPassword(dto.token, dto.password);
  }
}
