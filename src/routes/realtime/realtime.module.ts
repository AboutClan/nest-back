import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeSchema } from './realtime.entity';
import { RealtimeController } from './realtime.controller';
import RealtimeService from './realtime.service';
import { ImageModule } from 'src/imagez/image.module';
import { VoteModule } from 'src/vote/vote.module';
import { CollectionModule } from 'src/routes/collection/collection.module';
import { IREALTIME_REPOSITORY } from 'src/utils/di.tokens';
import { MongoRealtimeRepository } from './realtime.repository';
import { UserModule } from 'src/routes/user/user.module';
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
    forwardRef(() => UserModule),
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService, realtimeRepositoryProvider],
  exports: [RealtimeService, MongooseModule, realtimeRepositoryProvider],
})
export class RealtimeModule {}
