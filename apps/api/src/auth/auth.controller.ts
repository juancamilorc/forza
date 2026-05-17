import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  signIn(@Body() body: { email: string; password: string }) {
    return this.auth.signIn(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.auth.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  signOut(@CurrentUser() user: any) {
    return this.auth.signOut(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('trainer-id')
  async getTrainerId(@CurrentUser() user: any) {
    return this.auth.getTrainerId(user.sub);
  }
}
