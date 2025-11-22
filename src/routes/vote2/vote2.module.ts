import { ClassProvider, MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionModule } from 'src/routes/collection/collection.module';
import { PlaceModule } from 'src/routes/place/place.module';
import { RealtimeModule } from 'src/routes/realtime/realtime.module';
import { UserModule } from 'src/routes/user/user.module';
import { IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { SetDateParamMiddleware } from './middleware/setDateParam';
import { Vote2Controller } from './vote2.controller';
import { Vote2Schema } from './vote2.entity';
import { Vote2Service } from './vote2.service';
import { WebPushModule } from 'src/routes/webpush/webpush.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../fcm/fcm.module';
import { Vote2Repository } from './Vote2Repository';
import { ImageModule } from '../imagez/image.module';

const vote2RepositoryProvider: ClassProvider = {
  provide: IVOTE2_REPOSITORY,
  useClass: Vote2Repository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.VOTE, schema: Vote2Schema }]),
    PlaceModule,
    RealtimeModule,
    CollectionModule,
    UserModule,
    WebPushModule,
    FcmAModule,
    ImageModule,
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
