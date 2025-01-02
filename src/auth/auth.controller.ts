import { AuthService } from './auth.service';
import {
  Post,
  Body,
  HttpException,
  HttpStatus,
  Controller,
  Res,
} from '@nestjs/common';
import { LoginDto } from './dto/authDto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    if (!loginDto.name || !loginDto.password) {
      throw new HttpException('Неверный запрос', HttpStatus.BAD_REQUEST);
    }

    const autentification = await this.authService.validateLogin(loginDto);

    const token = await this.authService.createJWTToken(autentification);

    res.cookie('token', token.access_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
    });

    return res.json({ msg: 'Cookie установлено' });
  }
}
