import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { UserModule } from 'src/routes/user/user.module';
import { WebPushModule } from 'src/routes/webpush/webpush.module';
import {
  IGATHER_REPOSITORY,
  INOTICE_REPOSITORY,
  IVOTE2_REPOSITORY,
} from 'src/utils/di.tokens';
import { FcmAModule } from '../fcm/fcm.module';
import { GatherSchema } from '../gather/gather.entity';
import { GatherRepository } from '../gather/GatherRepository';
import { Vote2Repository } from '../vote2/Vote2Repository';
import { NoticeController } from './notice.controller';
import { noticeSchema } from './notice.entity';
import { MongoNoticeRepository } from './notice.repository';
import NoticeService from './notice.service';

const noticeRepositoryProvider: ClassProvider = {
  provide: INOTICE_REPOSITORY,
  useClass: MongoNoticeRepository,
};

const gatherRepositoryProvider: ClassProvider = {
  provide: IGATHER_REPOSITORY,
  useClass: GatherRepository,
};
const vote2RepositoryProvider: ClassProvider = {
  provide: IVOTE2_REPOSITORY,
  useClass: Vote2Repository,
};

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => WebPushModule),
    MongooseModule.forFeature([
      { name: DB_SCHEMA.NOTICE, schema: noticeSchema },
    ]),
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GATHER, schema: GatherSchema },
    ]),
    MongooseModule.forFeature([{ name: DB_SCHEMA.VOTE, schema: GatherSchema }]),
    FcmAModule,
  ],
  controllers: [NoticeController],
  providers: [
    NoticeService,
    noticeRepositoryProvider,
    gatherRepositoryProvider,
    vote2RepositoryProvider,
  ],
  exports: [NoticeService, MongooseModule, noticeRepositoryProvider],
})
export class NoticeModule {}
