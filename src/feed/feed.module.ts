import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Feed, FeedSchema } from './entity/feed.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Feed.name, schema: FeedSchema }]),
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
