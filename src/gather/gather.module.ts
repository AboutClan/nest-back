import { Module } from '@nestjs/common';
import { GatherController } from './gather.controller';
import { GatherService } from './gather.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { ChatService } from 'src/chatz/chat.service';
import { Gather, GatherSchema } from './entity/gather.entity';
import { Counter, CounterSchema } from 'src/counter/entity/counter.entity';
import { ChatModule } from 'src/chatz/chat.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Gather.name, schema: GatherSchema }]),
    MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }]),
    ChatModule,
  ],
  controllers: [GatherController],
  providers: [GatherService, ChatService],
  exports: [GatherService, MongooseModule],
})
export class GatherModule {}
