import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Card,
  CardSchema,
  GameKardOnlineSession,
  GameKardOnlineSessionSchema,
} from './game.models';
import { GameGateWay } from './game.gateway';

@Module({
  providers: [GameService, GameGateWay],
  imports: [
    MongooseModule.forFeature([
      { name: Card.name, schema: CardSchema },
      { name: GameKardOnlineSession.name, schema: GameKardOnlineSessionSchema },
    ]),
  ],
})
export class GameModule {}
