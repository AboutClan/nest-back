import { ClassProvider, MiddlewareConsumer, Module } from '@nestjs/common';
import { IVOTE2_REPOSITORY, IVOTE2_SERVICE } from 'src/utils/di.tokens';
import { Vote2Service } from './vote2.service';
import { Vote2Repository } from './vote2.repository';
import { Vote2Controller } from './vote2.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Vote2Schema } from './vote2.entity';
import { SetDateParamMiddleware } from './middleware/setDateParam';

const vote2ServiceProvider: ClassProvider = {
  provide: IVOTE2_SERVICE,
  useClass: Vote2Service,
};

const vote2RepositoryProvider: ClassProvider = {
  provide: IVOTE2_REPOSITORY,
  useClass: Vote2Repository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Vote2', schema: Vote2Schema }]),
  ],
  controllers: [Vote2Controller],
  providers: [vote2ServiceProvider, vote2RepositoryProvider],
  exports: [vote2ServiceProvider, vote2RepositoryProvider, MongooseModule],
})
export class Vote2Module {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SetDateParamMiddleware) // 작성한 미들웨어 적용
      .forRoutes('vote2/:date'); // 특정 경로에 미들웨어 적용
  }
}
