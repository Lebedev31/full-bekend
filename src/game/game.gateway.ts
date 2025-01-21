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

        this.server.to(idPlayer1).emit('move', this.gameService.setPlayerObject(data.player1, data.player2.length, data, sequence.player1));
        this.server.to(idPlayer2).emit('move', this.gameService.setPlayerObject(data.player2, data.player1.length, data, sequence.player2));
    }

    @SubscribeMessage('changeField')
    pushField(client: Socket, payload: any){
      console.log(payload);
    }

  } 