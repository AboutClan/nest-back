import { ClassProvider, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import {
  ICHAT_REPOSITORY,
  ICHAT_SERVICE,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { MongoChatRepository } from './chat.repository';
import { MongoUserRepository } from 'src/user/user.repository';
import { ChatSchema } from './chat.entity';

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
  providers: [ChatService, chatRepositoryProvider, userRepositoryProvider],
  exports: [chatRepositoryProvider, MongooseModule],
})
export class ChatModule {}
