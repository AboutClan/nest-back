import { ClassProvider, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/routes/user/user.module';
import { WebPushModule } from 'src/routes/webpush/webpush.module';
import { ICHAT_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { MongoUserRepository } from 'src/routes/user/user.repository';
import { ChatSchema } from './chat.entity';
import { ChatRepository } from './ChatRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../fcm/fcm.module';

const chatRepositoryProvider: ClassProvider = {
  provide: ICHAT_REPOSITORY,
  useClass: ChatRepository,
};

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: MongoUserRepository,
};

@Module({
  imports: [
    UserModule,
    WebPushModule,
    FcmAModule,
    MongooseModule.forFeature([{ name: DB_SCHEMA.CHAT, schema: ChatSchema }]),
  ],
  controllers: [ChatContoller],
  providers: [ChatService, chatRepositoryProvider, userRepositoryProvider],
  exports: [chatRepositoryProvider, MongooseModule],
})
export class ChatModule {}
