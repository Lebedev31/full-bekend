import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TCard, TGameKardOnlineSession } from 'type/types';

@Schema()
export class Card extends Document<TCard>{
    @Prop({ required: true}) 
    suit : string;

    @Prop({ required: true}) 
    imgPath: string;

    @Prop({ required: true}) 
    name: string;

    @Prop({ required: true}) 
    defaultPower: number;

    @Prop({ required: true}) 
    trump: string;

    @Prop({ required: true}) 
    presentStrength: number;
}

export const CardSchema = SchemaFactory.createForClass(Card);


@Schema()
export class GameKardOnlineSession extends Document<TGameKardOnlineSession>{
    @Prop({ required: true}) 
    idGame: string;

    @Prop({ required: true}) 
    trumpName: string;

    @Prop({ required: true, type: [{
        type: Types.ObjectId, ref: 'Card'
    }]}) 
    arrCard: Types.Array<Card>

    @Prop({ required: true, type: [{
        type: Types.ObjectId, ref: 'Card'
    }]}) 
    player1: Types.Array<Card>

    @Prop({ required: true, type: [{
        type: Types.ObjectId, ref: 'Card'
    }]}) 
    player2: Types.Array<Card>

    @Prop({ required: true, type: [{
        type: Types.ObjectId, ref: 'Card'
    }]}) 
    field: Types.Array<Card>

    @Prop({ required: true, type: [{
        type: Types.ObjectId, ref: 'Card'
    }]}) 
    discard: Types.Array<Card>

    @Prop({ required: true}) 
    count: number;
}

export const GameKardOnlineSessionSchema = SchemaFactory.createForClass(GameKardOnlineSession);