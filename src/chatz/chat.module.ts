import { ClassProvider, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatSchema } from './entity/chat.entity';
import { UserModule } from 'src/user/user.module';
import { FcmAModule } from 'src/fcm/fcm.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import { ICHAT_SERVICE } from 'src/utils/di.tokens';

const chatServiceProvider: ClassProvider = {
  provide: ICHAT_SERVICE,
  useClass: ChatService,
};

@Module({
  imports: [
    UserModule,
    FcmAModule,
    WebPushModule,
    MongooseModule.forFeature([{ name: 'Chat', schema: ChatSchema }]),
  ],
  controllers: [ChatContoller],
  providers: [chatServiceProvider],
  exports: [chatServiceProvider, MongooseModule],
})
export class ChatModule {}
