import { ClassProvider, Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedSchema } from './feed.entity';
import { UserModule } from 'src/user/user.module';
import {
  IFEED_REPOSITORY,
  IFEED_SERVICE,
  IUSER_SERVICE,
} from 'src/utils/di.tokens';
import { MongoFeedRepository } from './feed.repository';

const feedServiceProvider: ClassProvider = {
  provide: IFEED_SERVICE,
  useClass: FeedService,
};

const feedRepositoryProvider: ClassProvider = {
  provide: IFEED_REPOSITORY,
  useClass: MongoFeedRepository,
};

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: 'Feed', schema: FeedSchema }]),
  ],
  controllers: [FeedController],
  providers: [feedServiceProvider, feedRepositoryProvider],
  exports: [feedServiceProvider, MongooseModule, feedRepositoryProvider],
})
export class FeedModule {}
