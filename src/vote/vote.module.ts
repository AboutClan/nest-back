import {
  ClassProvider,
  forwardRef,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';
import { SetDateParamMiddleware } from './middleware/setDateParam';
import { MongooseModule } from '@nestjs/mongoose';
import { VoteSchema } from './vote.entity';
import { UserModule } from 'src/routes/user/user.module';
import { PlaceModule } from 'src/routes/place/place.module';
import { RealtimeModule } from 'src/routes/realtime/realtime.module';
import { CollectionModule } from 'src/routes/collection/collection.module';
import { IVOTE_SERVICE } from 'src/utils/di.tokens';

@Module({
  imports: [
    forwardRef(() => UserModule),
    PlaceModule,
    forwardRef(() => RealtimeModule),
    MongooseModule.forFeature([{ name: 'Vote', schema: VoteSchema }]),
    CollectionModule,
  ],
  controllers: [VoteController],
  providers: [VoteService],
  exports: [VoteService, MongooseModule],
})
export class VoteModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SetDateParamMiddleware) // 작성한 미들웨어 적용
      .forRoutes('vote/:date'); // 특정 경로에 미들웨어 적용
  }
}
