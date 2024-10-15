import { ClassProvider, Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedSchema } from './entity/feed.entity';
import { UserModule } from 'src/user/user.module';
import { IFEED_SERVICE } from 'src/utils/di.tokens';

const feedServiceProvider: ClassProvider = {
  provide: IFEED_SERVICE,
  useClass: FeedService,
};

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: 'Feed', schema: FeedSchema }]),
  ],
  controllers: [FeedController],
  providers: [feedServiceProvider],
  exports: [feedServiceProvider, MongooseModule],
})
export class FeedModule {}
