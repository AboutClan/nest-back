import { forwardRef, MiddlewareConsumer, Module } from '@nestjs/common';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';
import { SetDateParamMiddleware } from './middleware/setDateParam';
import { MongooseModule } from '@nestjs/mongoose';
import { VoteSchema } from './entity/vote.entity';
import { UserModule } from 'src/user/user.module';
import { PlaceModule } from 'src/place/place.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    PlaceModule,
    MongooseModule.forFeature([{ name: 'Vote', schema: VoteSchema }]),
  ],
  controllers: [VoteController],
  providers: [VoteService],
  exports: [VoteService, MongooseModule],
})
export class VoteModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SetDateParamMiddleware) // 작성한 미들웨어 적용
      .forRoutes('/:date'); // 특정 경로에 미들웨어 적용
  }
}
