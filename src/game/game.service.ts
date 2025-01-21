import { Injectable } from '@nestjs/common';
import { Card, GameKardOnlineSession } from './game.models';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { TCard, TGameKardOnlineSession } from 'type/types';

type Player = Omit<TGameKardOnlineSession, 'player2' | 'player1'| 'arrCard' | 'discard'> & {enemy: number, player: TCard[], sequence?: boolean };

@Injectable()
export class GameService {
    constructor(
        @InjectModel(Card.name) private cardModel: Model<Card>,
        @InjectModel(GameKardOnlineSession.name)
        private gameKardOnlineSession: Model<GameKardOnlineSession>
      ) {}

    async sortCard(){
        const deck = await this.cardModel.aggregate([
            {$sample: {size: 36}}
        ]);

        const newDeck: Card[] = [...deck];

        const mast =  newDeck[deck.length -1].suit;
        const powerCard = newDeck.map((item, index)=> {
            if(item.suit === mast){
                item.trump = mast;
                item.presentStrength = item.defaultPower + 10;
            } else {
                item.presentStrength = item.defaultPower;
            }


            return item;
        });

    const clientCardAndSession = await this.createSessionGame(powerCard, mast);
    return clientCardAndSession;

    }

  private async createSessionGame(deck: Card[], mast: string){
        const player1 = deck.slice(0, 6);
        const player2 = deck.slice(6, 12);
        const sliceArr = deck.slice(12);

        
        const gameSession = new this.gameKardOnlineSession({
            idGame: randomUUID(),
            trumpName: mast,
            arrCard: sliceArr,
            player1: player1,
            player2: player2,
            field: [],
            discard: [],
            count: 0
        });

        try {
            const saveSession = await gameSession.save();
            return saveSession.toObject();
        } catch (error) {
             throw new Error(error);
        }
       
    }

    setPlayerObject(player: TCard[], num: number, data: TGameKardOnlineSession, sequence?: boolean): Player {
        return {
           idGame: data.idGame,
           count: data.count,
           player: player,
           enemy: num,
           field: data.field,
           trumpName: data.trumpName,
           sequence,
        }
    }

}
