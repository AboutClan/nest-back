import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeSchema } from './realtime.entity';
import { RealtimeController } from './realtime.controller';
import RealtimeService from './realtime.service';
import { ImageModule } from 'src/imagez/image.module';
import { VoteModule } from 'src/vote/vote.module';
import { CollectionModule } from 'src/collection/collection.module';
import { IREALTIME_REPOSITORY, IREALTIME_SERVICE } from 'src/utils/di.tokens';
import { MongoRealtimeRepository } from './realtime.repository';

const realtimeServiceProvider: ClassProvider = {
  provide: IREALTIME_SERVICE,
  useClass: RealtimeService,
};
const realtimeRepositoryProvider: ClassProvider = {
  provide: IREALTIME_REPOSITORY,
  useClass: MongoRealtimeRepository,
};

@Module({
  imports: [
    ImageModule,
    forwardRef(() => VoteModule),
    CollectionModule,
    MongooseModule.forFeature([{ name: 'Realtime', schema: RealtimeSchema }]),
  ],
  controllers: [RealtimeController],
  providers: [realtimeServiceProvider, realtimeRepositoryProvider],
  exports: [
    realtimeServiceProvider,
    MongooseModule,
    realtimeRepositoryProvider,
  ],
})
export class RealtimeModule {}
