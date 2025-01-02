import { TUser } from '../../type/types';
import { IsPasswordValid } from 'src/utils/passwordValidator';

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UserDto implements TUser {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(40)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsPasswordValid()
  password: string;
}
