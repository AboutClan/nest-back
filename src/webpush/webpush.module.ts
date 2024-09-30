import { Module } from '@nestjs/common';
import { WebPushController } from './webpush.controller';
import { WebPushService } from './webpush.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entity/user.entity';
import {
  GroupStudy,
  GroupStudySchema,
} from 'src/groupStudy/entity/groupStudy.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: GroupStudy.name, schema: GroupStudySchema },
    ]),
  ],
  controllers: [WebPushController],
  providers: [WebPushService],
  exports: [WebPushService],
})
export class WebPushModule {}
