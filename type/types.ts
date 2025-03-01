export type TUser = {
  // юзер
  email: string;
  name: string;
  password: string;
  provider?: 'google' | 'yandex';
};

export type TLogin = {
  // логин
  name: string;
  password: string;
};

export type TGameKardOnlineSession = {
  // сессия игры
  idGame: string;
  idPlayer1: string;
  idPlayer2: string;
  trumpName: string;
  arrCard: TCard[];
  player1: TCard[];
  player2: TCard[];
  field: TCard[];
  discard: TCard[];
  count: number;
};

export type TCard = {
  // тип карты
  suit: string;
  imgPath: string;
  name: string;
  defaultPower: number;
  trump: string;
  presentStrength: number;
  topCard?: string;
  bottomCard?: string;
};


export type PayloadField = {  // тип приходящий с клиента для обновления сессии
  idCard: string;
  idGame: string;
  idPlayer: string;
}

export type PayloadDefence = PayloadField & {idCard2: string}
export type PayloadDiscard = {idGame: string, idPlayer: string}