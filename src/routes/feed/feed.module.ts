import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherModule } from 'src/routes/gather/gather.module';
import { GroupStudyModule } from 'src/routes/groupStudy/groupStudy.module';
import { UserModule } from 'src/routes/user/user.module';
import { IFEED_REPOSITORY } from 'src/utils/di.tokens';
import { FeedController } from './feed.controller';
import { FeedSchema } from './feed.entity';
import { FeedService } from './feed.service';
import { FeedRepository } from './FeedRepository';
import { WebPushModule } from 'src/routes/webpush/webpush.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../fcm/fcm.module';

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
    WebPushModule,
    FcmAModule,
  ],
  controllers: [FeedController],
  providers: [FeedService, feedRepositoryProvider],
  exports: [FeedService, MongooseModule, feedRepositoryProvider],
})
export class FeedModule {}
