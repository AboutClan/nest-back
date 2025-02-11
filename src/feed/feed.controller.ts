import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Query,
  UploadedFiles,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags } from '@nestjs/swagger';
import { FeedService } from './feed.service';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(
    @Query('id') id?: string,
    @Query('type') type?: string,
    @Query('typeId') typeId?: string,
    @Query('cursor') cursor?: string,
    @Query('isRecent') isRecent?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : null;

    if (id) {
      const feed = await this.feedService.findFeedById(id);
      return feed;
    } else if (type) {
      const feed = await this.feedService.findFeedByType(
        type,
        typeId,
        cursorNum,
        isRecent === 'true',
      );
      return feed;
    } else {
      const feeds = await this.feedService.findAllFeeds(
        cursorNum,
        isRecent === 'true',
      );
      return feeds;
    }
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 5, { storage: memoryStorage() }))
  async createFeed(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const { title, text, type, typeId, isAnonymous, subCategory } = body;
    const buffers = files.map((file) => file.buffer);

    await this.feedService.createFeed({
      title,
      text,
      type,
      buffers,
      typeId,
      isAnonymous,
      subCategory,
    });
    return { status: 'success' };
  }

  @Get('like')
  async getLike(@Query('id') id: string) {
    const feed = await this.feedService.findFeedLikeById(id);
    return feed;
  }

  @Post('like')
  async createLike(@Body('id') id: string) {
    await this.feedService.toggleLike(id);
    return { status: 'success' };
  }

  @Post('comment')
  async createComment(
    @Body('feedId') feedId: string,
    @Body('comment') comment: string,
  ) {
    await this.feedService.createComment(feedId, comment);
    return { status: 'success' };
  }

  @Patch('comment')
  async updateComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('comment') comment: string,
  ) {
    await this.feedService.updateComment(feedId, commentId, comment);
    return { status: 'success' };
  }

  @Delete('comment')
  async deleteComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
  ) {
    await this.feedService.deleteComment(feedId, commentId);
    return { status: 'success' };
  }

  @Post('comment/like')
  async createCommentLike(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
  ) {
    await this.feedService.createCommentLike(feedId, commentId);
    return { status: 'success' };
  }

  @Post('subComment/like')
  async createSubCommentLike(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
  ) {
    await this.feedService.createSubCommentLike(
      feedId,
      commentId,
      subCommentId,
    );
    return { status: 'success' };
  }

  @Post('subComment')
  async createSubComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('comment') comment: string,
  ) {
    await this.feedService.createSubComment(feedId, commentId, comment);
    return { status: 'success' };
  }

  @Patch('subComment')
  async updateSubComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
    @Body('comment') comment: string,
  ) {
    await this.feedService.updateSubComment(
      feedId,
      commentId,
      subCommentId,
      comment,
    );
    return { status: 'success' };
  }

  @Delete('subComment')
  async deleteSubComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
  ) {
    await this.feedService.deleteSubComment(feedId, commentId, subCommentId);
    return { status: 'success' };
  }
}
