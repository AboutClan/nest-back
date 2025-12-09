import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { UserModule } from 'src/MSA/User/user.module';
import {
  IGATHER_REPOSITORY,
  INOTICE_REPOSITORY,
  IVOTE2_REPOSITORY,
} from 'src/utils/di.tokens';
import { FcmAModule } from '../Notification/fcm.module';
import { GatherSchema } from '../Gather/entity/gather.entity';
import { GatherRepository } from '../Gather/infra/GatherRepository';
import { Vote2Repository } from '../Study/infra/Vote2Repository';
import { noticeSchema } from './entity/notice.entity';
import { MongoNoticeRepository } from './infra/notice.repository';
import NoticeService from './core/services/notice.service';
import { NoticeController } from './core/controllers/notice.controller';

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
