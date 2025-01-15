import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import NoticeService from './notice.service';
import { MongooseModule } from '@nestjs/mongoose';
import { noticeSchema } from './entity/notice.entity';
import { UserModule } from 'src/user/user.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import { INOTICE_REPOSITORY, INOTICE_SERVICE } from 'src/utils/di.tokens';
import { MongoNoticeRepository } from './notice.repository';

const noticeServiceProvider: ClassProvider = {
  provide: INOTICE_SERVICE,
  useClass: NoticeService,
};

const noticeRepositoryProvider: ClassProvider = {
  provide: INOTICE_REPOSITORY,
  useClass: MongoNoticeRepository,
};

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => WebPushModule),
    MongooseModule.forFeature([{ name: 'Notice', schema: noticeSchema }]),
  ],
  controllers: [NoticeController],
  providers: [noticeServiceProvider, noticeRepositoryProvider],
  exports: [noticeServiceProvider, MongooseModule, noticeRepositoryProvider],
})
export class NoticeModule {}
