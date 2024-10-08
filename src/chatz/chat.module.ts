import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './entity/chat.entity';
import { WebPushService } from 'src/webpush/webpush.service';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { FcmService } from 'src/fcm/fcm.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
  ],
  controllers: [ChatContoller],
  providers: [ChatService, FcmService, WebPushService],
  exports: [ChatService, FcmService, WebPushService, MongooseModule],
})
export class ChatModule {}
