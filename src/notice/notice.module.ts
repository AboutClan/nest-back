import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import NoticeService from './notice.service';
import { WebPushService } from 'src/webpush/webpush.service';
import { FcmService } from 'src/fcm/fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entity/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [NoticeController],
  providers: [NoticeService, WebPushService, FcmService],
  exports: [NoticeService],
})
export class NoticeModule {}
