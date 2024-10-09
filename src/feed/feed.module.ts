import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Feed, FeedSchema } from './entity/feed.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: 'Feed', schema: FeedSchema }]),
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService, MongooseModule],
})
export class FeedModule {}
