import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeSchema } from './realtime.entity';
import { RealtimeController } from './realtime.controller';
import RealtimeService from './realtime.service';
import { ImageModule } from 'src/imagez/image.module';
import { VoteModule } from 'src/vote/vote.module';
import { CollectionModule } from 'src/collection/collection.module';
import { IREALTIME_SERVICE } from 'src/utils/di.tokens';

const realtimeServiceProvider: ClassProvider = {
  provide: IREALTIME_SERVICE,
  useClass: RealtimeService,
};

@Module({
  imports: [
    ImageModule,
    forwardRef(() => VoteModule),
    CollectionModule,
    MongooseModule.forFeature([{ name: 'Realtime', schema: RealtimeSchema }]),
  ],
  controllers: [RealtimeController],
  providers: [realtimeServiceProvider],
  exports: [realtimeServiceProvider, MongooseModule],
})
export class RealtimeModule {}
