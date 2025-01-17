import { ClassProvider, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatSchema } from './entity/chat.entity';
import { UserModule } from 'src/user/user.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import {
  ICHAT_REPOSITORY,
  ICHAT_SERVICE,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { MongoChatRepository } from './chat.repository';
import { MongoUserRepository } from 'src/user/user.repository';

const chatServiceProvider: ClassProvider = {
  provide: ICHAT_SERVICE,
  useClass: ChatService,
};

const chatRepositoryProvider: ClassProvider = {
  provide: ICHAT_REPOSITORY,
  useClass: MongoChatRepository,
};

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: MongoUserRepository,
};

@Module({
  imports: [
    UserModule,
    WebPushModule,
    MongooseModule.forFeature([{ name: 'Chat', schema: ChatSchema }]),
  ],
  controllers: [ChatContoller],
  providers: [
    chatServiceProvider,
    chatRepositoryProvider,
    userRepositoryProvider,
  ],
  exports: [chatServiceProvider, chatRepositoryProvider, MongooseModule],
})
export class ChatModule {}
