import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class NiceAuthSession extends Document {
    @Prop({ required: true, unique: true })
    request_no: string;

    @Prop({ required: true })
    ticket: string;

    @Prop({ required: true })
    iterators: number;

    @Prop({ required: true })
    transaction_id: string;

    // 10분(600초) 후에 자동으로 문서가 삭제되도록 설정
    @Prop({ default: Date.now, expires: 600 })
    createdAt: Date;

    @Prop({ required: true })
    access_token: string;
}

export const NiceAuthSessionSchema = SchemaFactory.createForClass(NiceAuthSession);