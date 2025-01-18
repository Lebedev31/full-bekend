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
};
