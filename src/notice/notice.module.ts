import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import NoticeService from './notice.service';
import { MongooseModule } from '@nestjs/mongoose';
import { noticeSchema } from './entity/notice.entity';
import { UserModule } from 'src/user/user.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import { FcmAModule } from 'src/fcm/fcm.module';
import { INOTICE_SERVICE } from 'src/utils/di.tokens';

const noticeServiceProvider: ClassProvider = {
  provide: INOTICE_SERVICE,
  useClass: NoticeService,
};

@Module({
  imports: [
    forwardRef(() => UserModule),
    FcmAModule,
    forwardRef(() => WebPushModule),
    MongooseModule.forFeature([{ name: 'Notice', schema: noticeSchema }]),
  ],
  controllers: [NoticeController],
  providers: [noticeServiceProvider],
  exports: [noticeServiceProvider, MongooseModule],
})
export class NoticeModule {}
