import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { mongoConfig } from 'config/mongoDbConfig';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
       imports: [ConfigModule],
       inject: [ConfigService],
       useFactory: mongoConfig
    })
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}


