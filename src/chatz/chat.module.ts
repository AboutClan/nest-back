import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './entity/chat.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
  ],
  controllers: [ChatContoller],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
