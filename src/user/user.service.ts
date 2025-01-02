import { Injectable } from '@nestjs/common';
import { UserDto } from './userDto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.models';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(userDto: UserDto) {
    try {
      const examinationUser = await this.userModel.findOne({
        $or: [{ email: userDto.email }, { name: userDto.name }],
      });

      console.log(examinationUser);

      if (!examinationUser) {
        const user = new this.userModel(userDto);
        await user.save();
        return user;
      } else {
        throw new HttpException(
          'Такой пользователь уже существует',
          HttpStatus.UNAUTHORIZED,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
    }
  }
}
