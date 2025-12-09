import { ClassProvider, MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionModule } from 'src/MSA/Event/collection.module';
import { PlaceModule } from 'src/MSA/Place/place.module';
import { RealtimeModule } from 'src/MSA/Study/realtime.module';
import { UserModule } from 'src/MSA/User/user.module';
import { IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { Vote2Schema } from './entity/vote2.entity';
import { Vote2Service } from './core/services/vote2.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../Notification/fcm.module';
import { Vote2Repository } from './infra/Vote2Repository';
import { ImageModule } from '../../routes/imagez/image.module';
import { Vote2Controller } from './core/controllers/vote2.controller';
import { SetDateParamMiddleware } from './middleware/setDateParam';

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
