import { MiddlewareConsumer, Module } from '@nestjs/common';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';
import { SetDateParamMiddleware } from './middleware/setDateParam';

@Module({
  imports: [],
  controllers: [VoteController],
  providers: [VoteService],
  exports: [VoteService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SetDateParamMiddleware) // 작성한 미들웨어 적용
      .forRoutes('/:date'); // 특정 경로에 미들웨어 적용
  }
}
