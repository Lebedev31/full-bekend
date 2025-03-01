import { Injectable } from '@nestjs/common';
import { Card, GameKardOnlineSession } from './game.models';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { TCard, TGameKardOnlineSession } from 'type/types';

type Player = Omit<TGameKardOnlineSession, 'player2' | 'player1'| 'arrCard' | 'discard' | 'idPlayer1' | 'idPlayer2'> & 
                         {enemy: number, player: TCard[], sequence?: boolean, idPlayer: string };

@Injectable()
export class GameService {
    constructor(
        @InjectModel(Card.name) private cardModel: Model<Card>,
        @InjectModel(GameKardOnlineSession.name)
        private gameKardOnlineSession: Model<GameKardOnlineSession>
      ) {}

    async sortCard(idPlayer1: string, idPlayer2: string){
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

    const clientCardAndSession = await this.createSessionGame(powerCard, mast, idPlayer1, idPlayer2);
    return clientCardAndSession;

    }

  private async createSessionGame(deck: Card[], mast: string, idPlayer1: string, idPlayer2: string){
        const player1 = deck.slice(0, 6);
        const player2 = deck.slice(6, 12);
        const sliceArr = deck.slice(12);

        const gameSession = new this.gameKardOnlineSession({
            idGame: randomUUID(),
            idPlayer1,
            idPlayer2,
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

    setPlayerObject(player: TCard[], num: number, data: TGameKardOnlineSession, sequence?: boolean, idPlayer?: string): Player {
        return {
           idGame: data.idGame,
           count: data.count,
           player: player,
           enemy: num,
           field: data.field,
           trumpName: data.trumpName,
           sequence,
           idPlayer
        }
    }

    async sessionPushField(idCard: string, idGame: string, idPlayer: string){
        if(!new Types.ObjectId(idCard)){
            throw new Error('Неверный id карты');
        }
        
        const findCard = await this.cardModel.findById(idCard);

        if(findCard){
            const update = await this.gameKardOnlineSession.findOneAndUpdate({
                idGame: idGame
            }, 
            {
                $pull: {
                    player1: {_id: new Types.ObjectId(idCard)},
                    player2: {_id: new Types.ObjectId(idCard)}
                },

                $push: {
                    field: findCard
                },

                $inc: {
                    count: 1
                }

            },

            {new: true}
        );

        if(update){
            return update;
        } else {
            throw new Error('Ошибка обновления сессии');
        }
            
        }
    }

    async defenceUpdate(idCard: string, idGame: string, idPlayer: string, idCard2?: string){
        if(!new Types.ObjectId(idCard)){
            throw new Error('Неверный id карты');
        }

        if(!new Types.ObjectId(idCard2)){
            throw new Error('Неверный id карты');
        }

        const findCard = await this.cardModel.findById(idCard).lean().exec();
        const newFindCard = {...findCard, topCard: idCard2}; // добавляем верхнюю карту
        if(findCard){
          const updateTopAndBottom = await this.gameKardOnlineSession.findOneAndUpdate(
                {
                    idGame: idGame,
                    'field._id': new Types.ObjectId(idCard2)
                },
                {
                    $set: {
                        'field.$.bottomCard': new Types.ObjectId(idCard)
                    }
                }
            );
            
            const update = await this.gameKardOnlineSession.findOneAndUpdate(
                {
                    idGame: idGame
                },
                {
                    $pull: {
                        player1: {_id: new Types.ObjectId(idCard)},
                        player2: {_id: new Types.ObjectId(idCard)}
                    },
                    $push: {
                        field: newFindCard
                    },
                    $inc: {
                        count: 1
                    }
                },
                { new: true }
            );            
        if(update && updateTopAndBottom){
            return update;
        } else {
            throw new Error('Ошибка обновления сессии');
        }

        }

    }
    async discardUpdate(idGame: string) {
        const updatePipeline = [
            // Перемещаем карты с поля в сброс
            {
                $set: {
                    discard: { $concatArrays: ["$discard", "$field"] },
                    field: []
                }
            },
            // Вычисляем, сколько карт нужно первому игроку
            {
                $set: {
                    need1: {
                        $max: [{ $subtract: [6, { $size: "$player1" }] }, 0]
                    }
                }
            },
            // Берем карты для первого игрока и обрабатываем оставшуюся колоду
            {
                $set: {
                    cardsForPlayer1: {
                        $cond: {
                            if: { $gt: ["$need1", 0] },
                            then: { $slice: ["$arrCard", 0, "$need1"] },
                            else: []
                        }
                    }
                }
            },
            {
                $set: {
                    // Полностью убираем slice с тремя аргументами и вместо этого
                    // используем $cond для проверки, хватает ли карт для первого игрока
                    tempArrCard: {
                        $cond: {
                            if: { $gte: [{ $size: "$arrCard" }, "$need1"] },
                            then: {
                                $cond: {
                                    if: { $eq: ["$need1", 0] },
                                    then: "$arrCard", // Если карты не нужны, оставляем колоду как есть
                                    else: {
                                        $cond: {
                                            if: { $eq: [{ $size: "$arrCard" }, "$need1"] },
                                            then: [], // Если взяли все карты, возвращаем пустой массив
                                            else: { $slice: ["$arrCard", "$need1", { $size: "$arrCard" }] } // Иначе берем оставшиеся
                                        }
                                    }
                                }
                            },
                            else: [] // Если карт не хватает, возвращаем пустой массив (все карты уходят игроку)
                        }
                    }
                }
            },
            // Обновляем руку первого игрока
            {
                $set: {
                    player1: { $concatArrays: ["$player1", "$cardsForPlayer1"] }
                }
            },
            // Вычисляем, сколько карт нужно второму игроку
            {
                $set: {
                    need2: {
                        $max: [{ $subtract: [6, { $size: "$player2" }] }, 0]
                    }
                }
            },
            // Берем карты для второго игрока
            {
                $set: {
                    cardsForPlayer2: {
                        $cond: {
                            if: { $gt: ["$need2", 0] },
                            then: { $slice: ["$tempArrCard", 0, "$need2"] },
                            else: []
                        }
                    }
                }
            },
            {
                $set: {
                    // Аналогично делаем для второго игрока
                    arrCard: {
                        $cond: {
                            if: { $gte: [{ $size: "$tempArrCard" }, "$need2"] },
                            then: {
                                $cond: {
                                    if: { $eq: ["$need2", 0] },
                                    then: "$tempArrCard", // Если карты не нужны, оставляем колоду как есть
                                    else: {
                                        $cond: {
                                            if: { $eq: [{ $size: "$tempArrCard" }, "$need2"] },
                                            then: [], // Если взяли все карты, возвращаем пустой массив
                                            else: { $slice: ["$tempArrCard", "$need2", { $size: "$tempArrCard" }] } // Иначе берем оставшиеся
                                        }
                                    }
                                }
                            },
                            else: [] // Если карт не хватает, возвращаем пустой массив (все карты уходят игроку)
                        }
                    }
                }
            },
            // Обновляем руку второго игрока
            {
                $set: {
                    player2: { $concatArrays: ["$player2", "$cardsForPlayer2"] }
                }
            },
            // Очищаем временные поля
            {
                $unset: [
                    "need1",
                    "cardsForPlayer1",
                    "tempArrCard",
                    "need2",
                    "cardsForPlayer2"
                ]
            }
        ];
    
        const updatedSession = await this.gameKardOnlineSession.findOneAndUpdate(
            { idGame },
            updatePipeline,
            { new: true }
        ).exec();
    
        if (!updatedSession) {
            throw new Error('Game session not found');
        }
    
        return updatedSession;
    }
   
    async takeCard(idGame: string, idPlayer: string) {
        const session = await this.gameKardOnlineSession
          .findOne({ idGame })
          .populate('arrCard player1 player2 field discard')
          .exec();
      
        if (!session) throw new Error('Сессия не найдена');
        if (session.idPlayer1 !== idPlayer && session.idPlayer2 !== idPlayer) {
          throw new Error('Игрок не участвует в этой сессии');
        }

       
        const isPlayer1 = session.idPlayer1 === idPlayer;
        const targetPlayer = isPlayer1 ? 'player1' : 'player2';
        session[targetPlayer].push(...session.field);
        session.field.splice(0);
      
        const opponent = isPlayer1 ? 'player2' : 'player1';
        const needed = Math.max(6 - session[opponent].length, 0);
        
        if (needed > 0 && session.arrCard.length > 0) {
          const cardsToAdd = session.arrCard.splice(0, needed);
          session[opponent].push(...cardsToAdd);
        }
      
        await session.save();
        return session;
        }  

}
