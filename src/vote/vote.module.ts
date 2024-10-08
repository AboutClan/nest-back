import { MiddlewareConsumer, Module } from '@nestjs/common';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';
import { SetDateParamMiddleware } from './middleware/setDateParam';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { Place, PlaceSchema } from 'src/place/entity/place.entity';
import { Vote, VoteSchema } from './entity/vote.entity';
import { UserModule } from 'src/user/user.module';
import { PlaceModule } from 'src/place/place.module';

@Module({
  imports: [
    UserModule,
    PlaceModule,
    MongooseModule.forFeature([{ name: Vote.name, schema: VoteSchema }]),
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
