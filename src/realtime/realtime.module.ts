import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeSchema } from './realtime.entity';
import { RealtimeController } from './realtime.controller';
import RealtimeService from './realtime.service';
import { ImageModule } from 'src/imagez/image.module';
import { VoteModule } from 'src/vote/vote.module';
import { CollectionModule } from 'src/collection/collection.module';

@Module({
  imports: [
    ImageModule,
    VoteModule,
    CollectionModule,
    MongooseModule.forFeature([{ name: 'Realtime', schema: RealtimeSchema }]),
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService, MongooseModule],
})
export class RealtimeModule {}
