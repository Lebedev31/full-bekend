import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TUser } from '../../type/types';

@Schema()
export class User extends Document<TUser> {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ required: false, default: null })
  provider: 'google' | 'yandex' | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
