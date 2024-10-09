import { Module } from '@nestjs/common';
import { GatherController } from './gather.controller';
import { GatherService } from './gather.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatService } from 'src/chatz/chat.service';
import { GatherSchema } from './entity/gather.entity';
import { ChatModule } from 'src/chatz/chat.module';
import { UserModule } from 'src/user/user.module';
import { CounterModule } from 'src/counter/couter.module';

@Module({
  imports: [
    UserModule,
    CounterModule,
    MongooseModule.forFeature([{ name: 'Gather', schema: GatherSchema }]),
    ChatModule,
  ],
  controllers: [GatherController],
  providers: [GatherService],
  exports: [GatherService, MongooseModule],
})
export class GatherModule {}
