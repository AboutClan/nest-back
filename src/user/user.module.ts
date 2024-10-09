import { forwardRef, MiddlewareConsumer, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entity/user.entity';
import { PlaceModule } from 'src/place/place.module';
import { VoteModule } from 'src/vote/vote.module';
import { PromotionModule } from 'src/promotion/promotion.module';
import { LogModule } from 'src/logz/log.module';
import { NoticeModule } from 'src/notice/notice.module';
import { CounterModule } from 'src/counter/couter.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    forwardRef(() => VoteModule),
    PlaceModule,
    forwardRef(() => PromotionModule),
    LogModule,
    forwardRef(() => NoticeModule),
    CounterModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
