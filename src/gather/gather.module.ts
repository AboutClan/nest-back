import { ClassProvider, Module } from '@nestjs/common';
import { GatherController } from './gather.controller';
import { GatherService } from './gather.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherSchema } from './entity/gather.entity';
import { ChatModule } from 'src/chatz/chat.module';
import { UserModule } from 'src/user/user.module';
import { CounterModule } from 'src/counter/couter.module';
import { IGATHER_SERVICE } from 'src/utils/di.tokens';

const gatherServiceProvider: ClassProvider = {
  provide: IGATHER_SERVICE,
  useClass: GatherService,
};

@Module({
  imports: [
    UserModule,
    CounterModule,
    MongooseModule.forFeature([{ name: 'Gather', schema: GatherSchema }]),
    ChatModule,
  ],
  controllers: [GatherController],
  providers: [gatherServiceProvider],
  exports: [gatherServiceProvider, MongooseModule],
})
export class GatherModule {}
