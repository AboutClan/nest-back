import { ClassProvider, Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedSchema } from './feed.entity';
import { UserModule } from 'src/user/user.module';
import { IFEED_REPOSITORY } from 'src/utils/di.tokens';
import { MongoFeedRepository } from './feed.repository';
import { GatherModule } from 'src/gather/gather.module';
import { GroupStudyModule } from 'src/groupStudy/groupStudy.module';

const feedRepositoryProvider: ClassProvider = {
  provide: IFEED_REPOSITORY,
  useClass: MongoFeedRepository,
};

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: 'Feed', schema: FeedSchema }]),
    GatherModule,
    GroupStudyModule,
  ],
  controllers: [FeedController],
  providers: [FeedService, feedRepositoryProvider],
  exports: [FeedService, MongooseModule, feedRepositoryProvider],
})
export class FeedModule {}
