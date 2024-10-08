import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import NoticeService from './notice.service';
import { WebPushService } from 'src/webpush/webpush.service';
import { FcmService } from 'src/fcm/fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { Notice, noticeSchema } from './entity/notice.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Notice.name, schema: noticeSchema }]),
  ],
  controllers: [NoticeController],
  providers: [NoticeService, WebPushService, FcmService],
  exports: [NoticeService, MongooseModule],
})
export class NoticeModule {}
