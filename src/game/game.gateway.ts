import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { TGameKardOnlineSession, TCard } from 'type/types';

type GameRoom = {
  id: string;
  players: {
    player1: string | null;
    player2: string | null;
  };
  status: 'waiting' | 'full';
};

type Player = Omit<TGameKardOnlineSession, 'player2' | 'player1'| 'arrCard' | 'discard'> & {enemy: number, player: TCard[]};
  
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
           const deck = await this.gameService.sortCard();
           this.responsePlayer(deck, this.listOfRooms[findWaitingIndex].id, 
                                     this.listOfRooms[findWaitingIndex].players.player1, 
                                     this.listOfRooms[findWaitingIndex].players.player2,)
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

    private responsePlayer(data: TGameKardOnlineSession, roomName: string, idPlayer1: string, idPlayer2: string){

      const setPlayerObject = (player: TCard[], num: number): Player => {
          return {
             idGame: data.idGame,
             count: data.count,
             player: player,
             enemy: num,
             field: data.field,
             trumpName: data.trumpName
          }
      }

        this.server.to(idPlayer1).emit('move', setPlayerObject(data.player1, data.player2.length));
        this.server.to(idPlayer2).emit('move', setPlayerObject(data.player2, data.player1.length));
    }

  } 