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
  Inject,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FeedService } from './feed.service';
import { IFEED_SERVICE } from 'src/utils/di.tokens';
import { IFeedService } from './feedService.interface';

@Controller('feed')
export class FeedController {
  constructor(@Inject(IFEED_SERVICE) private feedService: IFeedService) {}

  @Get()
  async getFeed(
    @Query('id') id?: string,
    @Query('type') type?: string,
    @Query('typeId') typeId?: string,
    @Query('cursor') cursor?: string,
    @Query('isRecent') isRecent?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : null;

    try {
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
    } catch (err) {
      throw new HttpException(
        'Error fetching feed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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

    try {
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
    } catch (err) {
      throw new HttpException(
        'Error creating feed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('like')
  async getLike(@Query('id') id: string) {
    try {
      const feed = await this.feedService.findFeedLikeById(id);
      return feed;
    } catch (err) {
      throw new HttpException(
        'Error fetching like',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('like')
  async createLike(@Body('id') id: string) {
    try {
      await this.feedService.toggleLike(id);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error liking feed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment')
  async createComment(
    @Body('feedId') feedId: string,
    @Body('comment') comment: string,
  ) {
    try {
      await this.feedService.createComment(feedId, comment);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error creating comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('comment')
  async updateComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('comment') comment: string,
  ) {
    try {
      await this.feedService.updateComment(feedId, commentId, comment);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error updating comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('comment')
  async deleteComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
  ) {
    try {
      await this.feedService.deleteComment(feedId, commentId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment/like')
  async createCommentLike(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
  ) {
    try {
      await this.feedService.createCommentLike(feedId, commentId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error liking comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subComment/like')
  async createSubCommentLike(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
  ) {
    try {
      await this.feedService.createSubCommentLike(
        feedId,
        commentId,
        subCommentId,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error liking sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subComment')
  async createSubComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('comment') comment: string,
  ) {
    try {
      await this.feedService.createSubComment(feedId, commentId, comment);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error creating sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('subComment')
  async updateSubComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
    @Body('comment') comment: string,
  ) {
    try {
      await this.feedService.updateSubComment(
        feedId,
        commentId,
        subCommentId,
        comment,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error updating sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('subComment')
  async deleteSubComment(
    @Body('feedId') feedId: string,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
  ) {
    try {
      await this.feedService.deleteSubComment(feedId, commentId, subCommentId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
