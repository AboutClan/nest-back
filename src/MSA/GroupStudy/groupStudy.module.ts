import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { UserModule } from 'src/MSA/User/user.module';
import { RedisModule } from 'src/redis/redis.module';
import { CounterModule } from 'src/routes/counter/couter.module';
import {
  IGATHER_REPOSITORY,
  IGROUPCOMMENT_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
  INOTICE_REPOSITORY,
} from 'src/utils/di.tokens';
import { GatherSchema } from '../Gather/entity/gather.entity';
import { GatherRepository } from '../Gather/infra/GatherRepository';
import { noticeSchema } from '../Notice/entity/notice.entity';
import { MongoNoticeRepository } from '../Notice/infra/notice.repository';
import { FcmAModule } from '../Notification/fcm.module';
import { GroupStudyController } from './core/controllers/groupStudy.controller';
import GroupCommentService from './core/services/groupComment.service';
import GroupStudyService from './core/services/groupStudy.service';
import { groupCommentSchema } from './entity/groupComment.entity';
import { GroupStudySchema } from './entity/groupStudy.entity';
import { GroupStudyRepository } from './infra/GroupStudyRepository';
import { MongoGroupCommentRepository } from './infra/MongoGroupCommentRepository';

const groupStudyRepositoryProvider: ClassProvider = {
  provide: IGROUPSTUDY_REPOSITORY,
  useClass: GroupStudyRepository,
};
const gatherRepositoryProvider: ClassProvider = {
  provide: IGATHER_REPOSITORY,
  useClass: GatherRepository,
};
const noticeRepositoryProvider: ClassProvider = {
  provide: INOTICE_REPOSITORY,
  useClass: MongoNoticeRepository,
};

const groupCommentRepositoryProvider: ClassProvider = {
  provide: IGROUPCOMMENT_REPOSITORY,
  useClass: MongoGroupCommentRepository,
};

@Module({
  imports: [
    RedisModule,
    UserModule,
    CounterModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GROUPSTUDY, schema: GroupStudySchema },
      { name: DB_SCHEMA.NOTICE, schema: noticeSchema },
      { name: DB_SCHEMA.GATHER, schema: GatherSchema },
      { name: DB_SCHEMA.GROUP_COMMENT, schema: groupCommentSchema },
    ]),
    FcmAModule,
  ],
  controllers: [GroupStudyController],
  providers: [
    GroupStudyService,
    GroupCommentService,
    groupStudyRepositoryProvider,
    noticeRepositoryProvider,
    gatherRepositoryProvider,
    groupCommentRepositoryProvider,
  ],
  exports: [GroupStudyService, MongooseModule, groupStudyRepositoryProvider],
})
export class GroupStudyModule {}
