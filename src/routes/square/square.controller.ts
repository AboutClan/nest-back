import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Injectable,
  Param,
  Patch,
  PipeTransform,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CreateSquareDto } from './createSquareDto';
import { SecretSquareCategory } from './square.entity';
import SquareService from './square.service';

// DTOs for request validation

@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: any) {
    return value.pollItems && value.canMultiple
      ? {
          ...value,
          pollItems: JSON.parse(value.pollItems),
          canMultiple: JSON.parse(value.canMultiple),
        }
      : {
          ...value,
        };
  }
}

@ApiTags('square')
@Controller('square')
export class SquareController {
  constructor(private readonly squareService: SquareService) {}

  @Get()
  async getSquareList(
    @Query('category')
    category: SecretSquareCategory | 'secretAll' | 'normalAll' = 'normalAll',
    @Query('cursor') cursor: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor, 10) : null;
    try {
      const squareList = await this.squareService.getSquareList({
        category,
        cursorNum,
      });
      return { squareList };
    } catch (err) {
      throw new HttpException(
        'Error fetching square list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 5, { storage: memoryStorage() }))
  async createSquare(
    @UploadedFiles() files: Express.Multer.File[],
    @Body(new ValidationPipe()) createSquareDto: CreateSquareDto,
  ) {
    const buffers: Buffer[] = files ? files.map((file) => file.buffer) : [];

    try {
      const { squareId } = await this.squareService.createSquare({
        ...createSquareDto,
        poll: {
          pollItems: createSquareDto.pollItems,
          canMultiple: createSquareDto.canMultiple,
        } as any,
        buffers,
      });
      return { squareId };
    } catch (err) {
      console.log(err);
      throw new HttpException(
        'Error creating square',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment')
  async createSquareComment(
    @Body() commentDto: { comment: string; squareId: string },
  ) {
    try {
      await this.squareService.createSquareComment({
        comment: commentDto.comment,
        squareId: commentDto.squareId,
      });
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error creating comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //todo: 왜안됨
  @Delete('comment')
  async deleteSquareComment(
    @Body() commentDto: { squareId: string; commentId: string },
  ) {
    try {
      await this.squareService.deleteSquareComment(commentDto);
      return { status: 'success' };
    } catch (err: any) {
      console.log(err);
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subComment')
  async createSubComment(
    @Body()
    commentDto: {
      squareId: string;
      commentId: string;
      comment: string;
    },
  ) {
    try {
      await this.squareService.createSubComment(
        commentDto.squareId,
        commentDto.commentId,
        commentDto.comment,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error creating sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('subComment')
  async deleteSubComment(
    @Body()
    commentDto: {
      squareId: string;
      commentId: string;
      subCommentId: string;
    },
  ) {
    try {
      await this.squareService.deleteSubComment(
        commentDto.squareId,
        commentDto.commentId,
        commentDto.subCommentId,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':squareId')
  async deleteSquare(@Param('squareId') squareId: string) {
    try {
      await this.squareService.deleteSquare(squareId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting square',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':squareId')
  async getSquare(@Param('squareId') squareId: string) {
    try {
      const square = await this.squareService.getSquare(squareId);
      console.log(square);
      return { square };
    } catch (err) {
      throw new HttpException(
        'Error fetching square',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Get(':squareId')
  // async test() {
  //   const square = await this.squareService.test();
  //   return { square };
  // }

  @Patch(':squareId/poll')
  async patchPoll(
    @Param('squareId') squareId: string,
    @Body() pollDto: { pollItems: string[] },
  ) {
    try {
      await this.squareService.patchPoll({
        squareId,
        pollItems: pollDto.pollItems,
      });
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error patching poll',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':squareId/poll')
  async getCurrentPollItems(@Param('squareId') squareId: string) {
    try {
      const currentPollItems = await this.squareService.getCurrentPollItems({
        squareId,
      });
      return { pollItems: currentPollItems };
    } catch (err) {
      throw new HttpException(
        'Error fetching poll items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':squareId/like')
  async putLikeSquare(@Param('squareId') squareId: string) {
    try {
      await this.squareService.putLikeSquare({ squareId });
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error liking square',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':squareId/like')
  async deleteLikeSquare(@Param('squareId') squareId: string) {
    try {
      await this.squareService.deleteLikeSquare({ squareId });
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error unliking square',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':squareId/like')
  async getIsLike(@Param('squareId') squareId: string) {
    try {
      const isLike = await this.squareService.getIsLike({ squareId });
      return { isLike };
    } catch (err) {
      throw new HttpException(
        'Error fetching like status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment/like')
  async setCommentLike(
    @Body('squareId') squareId: string,
    @Body('commentId') commentId: string,
  ) {
    try {
      await this.squareService.createCommentLike(squareId, commentId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error liking comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subComment/like')
  async setSubCommentLike(
    @Body('squareId') squareId: string,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
  ) {
    try {
      await this.squareService.createSubCommentLike(
        squareId,
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
}
