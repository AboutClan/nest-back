import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './entity/chat.entity';
import { WebPushService } from 'src/webpush/webpush.service';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { FcmService } from 'src/fcm/fcm.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [ChatContoller],
  providers: [ChatService, FcmService, WebPushService],
  exports: [ChatService, FcmService, WebPushService],
})
export class ChatModule {}
