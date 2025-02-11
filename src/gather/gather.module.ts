import { ClassProvider, Module } from '@nestjs/common';
import { GatherController } from './gather.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherSchema } from './gather.entity';
import { UserModule } from 'src/user/user.module';
import { CounterModule } from 'src/counter/couter.module';
import { IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import { MongoGatherRepository } from './gather.repository';
import { WebPushModule } from 'src/webpush/webpush.module';
import { GatherService } from './gather.service';

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
  providers: [GatherService, gatherRepositoryProvider],
  exports: [GatherService, MongooseModule, gatherRepositoryProvider],
})
export class GatherModule {}
