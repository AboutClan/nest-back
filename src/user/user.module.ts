import { MiddlewareConsumer, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entity/user.entity';
import { Place, PlaceSchema } from 'src/place/entity/place.entity';
import { Vote, VoteSchema } from 'src/vote/entity/vote.entity';
import {
  Promotion,
  promotionSchema,
} from 'src/promotion/entity/promotion.entity';
import { Log, LogSchema } from 'src/logz/entity/log.entity';
import { Notice, noticeSchema } from 'src/notice/entity/notice.entity';
import { PlaceModule } from 'src/place/place.module';
import { VoteModule } from 'src/vote/vote.module';
import { PromotionModule } from 'src/promotion/promotion.module';
import { LogModule } from 'src/logz/log.module';
import { NoticeModule } from 'src/notice/notice.module';

@Module({
  imports: [
    PlaceModule,
    VoteModule,
    PromotionModule,
    LogModule,
    NoticeModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
