import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFiles,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SquareService } from '../services/squareService';
import {
  IsNotEmpty,
  IsArray,
  IsIn,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

// DTOs for request validation
class CreateSquareDto {
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsNotEmpty({ message: 'Content is required' })
  content: string;

  @IsIn(['poll', 'general'], { message: 'Invalid type' })
  type: string;

  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsOptional()
  @IsArray()
  pollItems?: string[];

  @IsOptional()
  @IsBoolean()
  canMultiple?: boolean;
}

@Controller('square')
export class SquareController {
  constructor(private readonly squareService: SquareService) {}

  @Get()
  async getSquareList(
    @Query('category') category: string = 'all',
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
    @Body() createSquareDto: CreateSquareDto,
  ) {
    const buffers: Buffer[] = files ? files.map((file) => file.buffer) : [];

    try {
      const { squareId } = await this.squareService.createSquare({
        ...createSquareDto,
        poll: {
          pollItems: createSquareDto.pollItems,
          canMultiple: createSquareDto.canMultiple,
        },
        buffers,
      });
      return { squareId };
    } catch (err) {
      throw new HttpException(
        'Error creating square',
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
      return { square };
    } catch (err) {
      throw new HttpException(
        'Error fetching square',
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

  @Delete('comment')
  async deleteSquareComment(
    @Body() commentDto: { squareId: string; commentId: string },
  ) {
    try {
      await this.squareService.deleteSquareComment(commentDto);
      return { status: 'success' };
    } catch (err) {
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
}