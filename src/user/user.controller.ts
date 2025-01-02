import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from './userDto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Post, Body } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private readonly saltRound = 10;

  @Post('create')
  async createUser(@Body() userDto: UserDto) {
    if (!userDto) {
      throw new HttpException('Неверные данные', HttpStatus.BAD_REQUEST);
    }

    try {
      const hashedPassword = bcrypt.hashSync(userDto.password, this.saltRound);
      if (hashedPassword) {
        const user = await this.userService.create({
          ...userDto,
          password: hashedPassword,
        });

        return user;
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw error;
    }
  }
}
