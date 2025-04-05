import { ClassProvider, MiddlewareConsumer, Module } from '@nestjs/common';
import { IVOTE2_REPOSITORY, IVOTE2_SERVICE } from 'src/utils/di.tokens';
import { Vote2Service } from './vote2.service';
import { Vote2Repository } from './vote2.repository';
import { Vote2Controller } from './vote2.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Vote2Schema } from './vote2.entity';
import { SetDateParamMiddleware } from './middleware/setDateParam';
import { PlaceModule } from 'src/place/place.module';
import { RealtimeModule } from 'src/realtime/realtime.module';

const vote2RepositoryProvider: ClassProvider = {
  provide: IVOTE2_REPOSITORY,
  useClass: Vote2Repository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Vote2', schema: Vote2Schema }]),
    PlaceModule,
    RealtimeModule,
  ],

  controllers: [Vote2Controller],
  providers: [Vote2Service, vote2RepositoryProvider],
  exports: [Vote2Service, vote2RepositoryProvider, MongooseModule],
})
export class Vote2Module {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SetDateParamMiddleware) // 작성한 미들웨어 적용
      .forRoutes('vote2/:date'); // 특정 경로에 미들웨어 적용
  }
}
