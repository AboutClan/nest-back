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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Place.name, schema: PlaceSchema }]),
    MongooseModule.forFeature([{ name: Vote.name, schema: VoteSchema }]),
    MongooseModule.forFeature([
      { name: Promotion.name, schema: promotionSchema },
    ]),
    MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
    MongooseModule.forFeature([{ name: Notice.name, schema: noticeSchema }]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class AppModule {}
