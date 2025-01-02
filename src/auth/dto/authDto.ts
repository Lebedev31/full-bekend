import { IsNotEmpty, IsString } from 'class-validator';
import { IsPasswordValid } from 'src/utils/passwordValidator';
import { TLogin } from 'type/types';

export class LoginDto implements TLogin {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @IsPasswordValid()
  password: string;
}
