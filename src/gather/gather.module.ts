import { ClassProvider, Module } from '@nestjs/common';
import { GatherController } from './gather.controller';
import { GatherService } from './gather.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherSchema } from './gather.entity';
import { ChatModule } from 'src/chatz/chat.module';
import { UserModule } from 'src/user/user.module';
import { CounterModule } from 'src/counter/couter.module';
import { IGATHER_REPOSITORY, IGATHER_SERVICE } from 'src/utils/di.tokens';
import { MongoGatherRepository } from './gather.repository';
import { WebPushModule } from 'src/webpush/webpush.module';

const gatherServiceProvider: ClassProvider = {
  provide: IGATHER_SERVICE,
  useClass: GatherService,
};

const gatherRepositoryProvider: ClassProvider = {
  provide: IGATHER_REPOSITORY,
  useClass: MongoGatherRepository,
};

@Module({
  imports: [
    UserModule,
    CounterModule,
    MongooseModule.forFeature([{ name: 'Gather', schema: GatherSchema }]),
    WebPushModule,
  ],
  controllers: [GatherController],
  providers: [gatherServiceProvider, gatherRepositoryProvider],
  exports: [gatherServiceProvider, MongooseModule, gatherRepositoryProvider],
})
export class GatherModule {}
