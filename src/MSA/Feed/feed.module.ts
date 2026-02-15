import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherModule } from 'src/MSA/Gather/gather.module';
import { UserModule } from 'src/MSA/User/user.module';
import { IFEED_REPOSITORY, IFEEDCOMMENT_REPOSITORY } from 'src/utils/di.tokens';
import { FeedSchema } from './entity/feed.entity';
import { FeedService } from './core/services/feed.service';
import { FeedRepository } from './infra/MongoFeedRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../Notification/fcm.module';
import { GroupStudyModule } from 'src/MSA/GroupStudy/groupStudy.module';
import { FeedController } from './core/controllers/feed.controller';
import { MongoFeedCommentRepository } from './infra/MongoFeedCommentRepository';
import FeedCommentService from './core/services/feedComment.service';
import { FeedCommentSchema } from './entity/feedComment.entity';

const feedRepositoryProvider: ClassProvider = {
  provide: IFEED_REPOSITORY,
  useClass: FeedRepository,
};
const feedCommentRepositoryProvider: ClassProvider = {
  provide: IFEEDCOMMENT_REPOSITORY,
  useClass: MongoFeedCommentRepository,
};

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.FEED, schema: FeedSchema },
      { name: DB_SCHEMA.FEED_COMMENT, schema: FeedCommentSchema },
    ]),
    GatherModule,
    GroupStudyModule,
    FcmAModule,
  ],
  controllers: [FeedController],
  providers: [
    FeedService,
    FeedCommentService,
    feedRepositoryProvider,
    feedCommentRepositoryProvider,
  ],
  exports: [FeedService, MongooseModule, feedRepositoryProvider],
})
export class FeedModule { }
