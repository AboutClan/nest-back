import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { noticeSchema } from './notice.entity';
import { UserModule } from 'src/routes/user/user.module';
import { WebPushModule } from 'src/routes/webpush/webpush.module';
import { INOTICE_REPOSITORY } from 'src/utils/di.tokens';
import { MongoNoticeRepository } from './notice.repository';
import NoticeService from './notice.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

const noticeRepositoryProvider: ClassProvider = {
  provide: INOTICE_REPOSITORY,
  useClass: MongoNoticeRepository,
};

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => WebPushModule),
    MongooseModule.forFeature([
      { name: DB_SCHEMA.NOTICE, schema: noticeSchema },
    ]),
  ],
  controllers: [NoticeController],
  providers: [NoticeService, noticeRepositoryProvider],
  exports: [NoticeService, MongooseModule, noticeRepositoryProvider],
})
export class NoticeModule {}
