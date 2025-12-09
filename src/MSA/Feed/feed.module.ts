import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherModule } from 'src/MSA/Gather/gather.module';
import { UserModule } from 'src/MSA/User/user.module';
import { IFEED_REPOSITORY } from 'src/utils/di.tokens';
import { FeedSchema } from './entity/feed.entity';
import { FeedService } from './core/services/feed.service';
import { FeedRepository } from './infra/FeedRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../Notification/fcm.module';
import { CommentModule } from '../../routes/comment/comment.module';
import { GroupStudyModule } from 'src/MSA/GroupStudy/groupStudy.module';
import { FeedController } from './core/controllers/feed.controller';

const feedRepositoryProvider: ClassProvider = {
  provide: IFEED_REPOSITORY,
  useClass: FeedRepository,
};

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: DB_SCHEMA.FEED, schema: FeedSchema }]),
    GatherModule,
    GroupStudyModule,
    FcmAModule,
    CommentModule,
  ],
  controllers: [FeedController],
  providers: [FeedService, feedRepositoryProvider],
  exports: [FeedService, MongooseModule, feedRepositoryProvider],
})
export class FeedModule {}
