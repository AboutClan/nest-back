import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './entity/chat.entity';
import { WebPushService } from 'src/webpush/webpush.service';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { FcmService } from 'src/fcm/fcm.service';
import { UserModule } from 'src/user/user.module';
import { FcmAModule } from 'src/fcm/fcm.module';
import { WebPushModule } from 'src/webpush/webpush.module';

@Module({
  imports: [
    UserModule,
    FcmAModule,
    WebPushModule,
    MongooseModule.forFeature([{ name: 'Chat', schema: ChatSchema }]),
  ],
  controllers: [ChatContoller],
  providers: [ChatService],
  exports: [ChatService, MongooseModule],
})
export class ChatModule {}
