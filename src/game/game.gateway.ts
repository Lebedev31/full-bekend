import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { TGameKardOnlineSession, TCard, PayloadField, PayloadDefence, PayloadDiscard } from 'type/types';

type GameRoom = {
  id: string;
  players: {
    player1: string | null;
    player2: string | null;
  };
  status: 'waiting' | 'full';
};
  
@WebSocketGateway({
    cors: {
      origin: '*'
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })
  export class GameGateWay implements OnGatewayConnection, OnGatewayDisconnect {

    constructor(private gameService: GameService){}
  
    @WebSocketServer()

    server: Server;

    private listOfRooms: GameRoom[] = [];
  
    async handleConnection(client: Socket) {
      console.log(`${client.id} подключился`);
      client.emit('message', 'Добро пожаловать на сервер');
      this.joinRoom(client);
    }
  
    async handleDisconnect(client: Socket) {
      console.log(`${client.id} откючился`);
      this.deleteRoomPlayer(client.id);
    }

   async joinRoom(client: Socket){
      
       const findWaitingIndex = this.listOfRooms.findIndex((item)=> item.status === 'waiting');

        if(findWaitingIndex === -1){
          
           const gameRoom: GameRoom = {
              id: `room${Date.now()}`,
              players: {
                player1: client.id,
                player2: null
              },

              status: 'waiting'
           }
           this.listOfRooms.push(gameRoom);
           client.join(gameRoom.id);
        } else {
           this.listOfRooms[findWaitingIndex].status = 'full';
           this.listOfRooms[findWaitingIndex].players.player2 = client.id;
           client.join(this.listOfRooms[findWaitingIndex].id);
           const idPlayer1 = this.listOfRooms[findWaitingIndex].players.player1;
           const idPlayer2 = this.listOfRooms[findWaitingIndex].players.player2;
           const deck = await this.gameService.sortCard(idPlayer1, idPlayer2 );
           this.responsePlayer(deck, this.listOfRooms[findWaitingIndex].id, idPlayer1, idPlayer2);
        }   
    }

    deleteRoomPlayer(id: string){
       this.listOfRooms.forEach((item, index)=> {

          if(item.players.player1 === id){
              item.players.player1 = null;
              this.listOfRooms[index].status = 'waiting';
          }
         
          if(item.players.player2 === id){
             item.players.player2 = null;
             this.listOfRooms[index].status = 'waiting';
          }

          if(item.players.player1 === null && item.players.player2 === null){
            this.listOfRooms.splice(index, 1);
          } 
       })
    }

    async deleteSession(id: string){
       
    }

    private responsePlayer(data: TGameKardOnlineSession, roomName: string, idPlayer1: string, idPlayer2: string){

        const setSequence = (player1: TCard[], player2: TCard[], trump: string)=>{  // проверяем наименьшую козырную карту и кто будет первым ходить
            const filterPlayer1 = player1.filter((item)=> item.trump === trump);
            const filterPlayer2 = player2.filter((item)=> item.trump === trump);

            if(filterPlayer1.length === 0 && filterPlayer2.length === 0){ // если у обоих игроков не козяря, выбираем случайного
              const randomNumber = Math.floor(Math.random() * 2) + 1;
               return{
                 player1: randomNumber === 2,
                 player2: randomNumber === 1
               }
            }
           const minTrupm1 = filterPlayer1.length > 0 ? Math.min(...filterPlayer1.map((item)=> item.defaultPower)): false;
           const minTrupm2 = filterPlayer2.length > 0 ? Math.min(...filterPlayer2.map((item)=> item.defaultPower)): false;

           return {
             player1: minTrupm1 && (minTrupm2 ? minTrupm1 < minTrupm2: true),
             player2: minTrupm2 && (minTrupm1 ? minTrupm2 < minTrupm1: true)
           }

        }

        const sequence = setSequence(data.player1, data.player2, data.trumpName);

        this.server.to(idPlayer1).emit('move', this.gameService.setPlayerObject(data.player1, data.player2.length, data, sequence.player1, idPlayer1));
        this.server.to(idPlayer2).emit('move', this.gameService.setPlayerObject(data.player2, data.player1.length, data, sequence.player2, idPlayer2));
    }

    @SubscribeMessage('changeField')
   async pushField(client: Socket, payload: PayloadField){
    const { idCard, idGame, idPlayer } = payload;
       const session = await this.gameService.sessionPushField(idCard, idGame, idPlayer) as TGameKardOnlineSession;
       this.responseSession(session, 'updateField')
      
    }

    responseSession(data: TGameKardOnlineSession, event: string){
      this.server.to(data.idPlayer1).emit(event, this.gameService.setPlayerObject(data.player1, data.player2.length, data));
      this.server.to(data.idPlayer2).emit(event, this.gameService.setPlayerObject(data.player2, data.player1.length, data));
    }

    @SubscribeMessage('defenceField')
    async defenceUpdateSession(client: Socket, payload: PayloadDefence ){
      const { idCard, idGame, idPlayer, idCard2 } = payload;
      const session = await this.gameService.defenceUpdate(idCard, idGame, idPlayer, idCard2) as TGameKardOnlineSession;
      this.responseSession(session, 'defenceField');
    }

    @SubscribeMessage('discard')
    async discardField(client: Socket, payload: PayloadDiscard){
       const {idGame, idPlayer} = payload;
       const session = await this.gameService.discardUpdate(idGame);
       const sequence1 = session.idPlayer1 === idPlayer ? false: true;
       const sequence2 = session.idPlayer2 === idPlayer ? false: true;
       this.server.to(session.idPlayer1).emit('discard', this.gameService.setPlayerObject(session.player1, session.player2.length, session, sequence1));
       this.server.to(session.idPlayer2).emit('discard', this.gameService.setPlayerObject(session.player2, session.player1.length, session, sequence2));
    }

    @SubscribeMessage('take')
    async takeCard(client: Socket, payload: PayloadDiscard){
      console.log(payload);
       const {idGame, idPlayer} = payload;
       const session = await this.gameService.takeCard(idGame, idPlayer);
       const sequence1 = session.idPlayer1 === idPlayer ? true: false;
       const sequence2 = session.idPlayer2 === idPlayer ? true: false;
       this.server.to(session.idPlayer1).emit('take', this.gameService.setPlayerObject(session.player1, session.player2.length, session, sequence1));
       this.server.to(session.idPlayer2).emit('take', this.gameService.setPlayerObject(session.player2, session.player1.length, session, sequence2));
    }
  } 