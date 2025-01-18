import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user/user.models';
import { LoginDto } from './dto/authDto';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { TUser } from 'type/types';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async validateLogin(loginDto: LoginDto) {
    const user = (await this.userModel.findOne({
      name: loginDto.name,
    })) as TUser;
    if (!user) {
      throw new HttpException('Неверные данные', HttpStatus.BAD_REQUEST);
    }

    const isMatch = bcrypt.compareSync(loginDto.password, user.password);
    if (!isMatch) {
      throw new HttpException('Неверные данные', HttpStatus.BAD_REQUEST);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async createJWTToken(payload: any) {
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async createSocialUser(user: TUser) {
    const examinationUser = await this.userModel.findOne({
      $or: [{ email: user.email }, { name: user.name }],
    });

    if (examinationUser) {
      return true;
    }

    if (!examinationUser) {
      const socialUser = new this.userModel({
        name: user.name,
        email: user.email,
        provider: user.provider,
      });
      await socialUser.save();
      console.log(socialUser);
      return true;
    }

    return false;
  }
}
