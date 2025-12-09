import {
  ClassProvider,
  forwardRef,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeSchema } from './entity/realtime.entity';
import RealtimeService from './core/services/realtime.service';
import { ImageModule } from 'src/routes/imagez/image.module';
import { CollectionModule } from 'src/MSA/Event/collection.module';
import { IREALTIME_REPOSITORY } from 'src/utils/di.tokens';
import { UserModule } from 'src/MSA/User/user.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { SetDateParamMiddleware } from './middleware/setDateParam';
import { RealtimeRepository } from './infra/RealtimeRepository';
import { PlaceModule } from '../Place/place.module';
import { RealtimeController } from './core/controllers/realtime.controller';

const realtimeRepositoryProvider: ClassProvider = {
  provide: IREALTIME_REPOSITORY,
  useClass: RealtimeRepository,
};

@Module({
  imports: [
    ImageModule,
    CollectionModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.REALTIME, schema: RealtimeSchema },
    ]),
    forwardRef(() => UserModule),
    PlaceModule,
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService, realtimeRepositoryProvider],
  exports: [RealtimeService, MongooseModule, realtimeRepositoryProvider],
})
export class RealtimeModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SetDateParamMiddleware) // 작성한 미들웨어 적용
      .forRoutes('realtime/:date'); // 특정 경로에 미들웨어 적용
  }
}
