import { AuthService } from './auth.service';
import {
  Post,
  Body,
  HttpException,
  HttpStatus,
  Controller,
  Res,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LoginDto } from './dto/authDto';
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { TUser } from 'type/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    console.log(loginDto);
    if (!loginDto.name || !loginDto.password) {
      throw new HttpException('Неверный запрос', HttpStatus.BAD_REQUEST);
    }

    const autentification = await this.authService.validateLogin(loginDto);

    const token = await this.authService.createJWTToken(autentification);
    this.createCookie(token, res);
    return res.status(HttpStatus.OK).json({ message: 'Cookie установлено' });
  }

  private createCookie(token: { access_token: string }, res: Response) {
    res.cookie('token', token.access_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
    });
  }
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'User not found' });
    }

    const isUserCreated = await this.authService.createSocialUser(
      req.user as TUser,
    );

    if (isUserCreated) {
      const { name, email } = req.user as TUser;
      const token = await this.authService.createJWTToken({ name, email });
      this.createCookie(token, res);
      res.redirect('')
    } else {
      return res.status(500).json({ message: 'Серверная ошибка' });
    }
  }
}
