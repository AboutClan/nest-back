import { ClassProvider, Module } from '@nestjs/common';
import { ChatService } from './core/services/chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/MSA/User/user.module';
import { ICHAT_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { ChatSchema } from './entity/chat.entity';
import { ChatRepository } from './infra/ChatRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../Notification/fcm.module';
import { UserRepository } from 'src/MSA/User/infra/UserRepository';
import { ChatContoller } from './core/controllers/chat.controller';

const chatRepositoryProvider: ClassProvider = {
  provide: ICHAT_REPOSITORY,
  useClass: ChatRepository,
};

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: UserRepository,
};

@Module({
  imports: [
    UserModule,
    FcmAModule,
    MongooseModule.forFeature([{ name: DB_SCHEMA.CHAT, schema: ChatSchema }]),
  ],
  controllers: [ChatContoller],
  providers: [ChatService, chatRepositoryProvider, userRepositoryProvider],
  exports: [chatRepositoryProvider, MongooseModule],
})
export class ChatModule {}
