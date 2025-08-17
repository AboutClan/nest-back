import {
  Body,
  Controller,
  Delete,
  Get,
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
    const squareList = await this.squareService.getSquareList({
      category,
      cursorNum,
    });
    return { squareList };
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 5, { storage: memoryStorage() }))
  async createSquare(
    @UploadedFiles() files: Express.Multer.File[],
    @Body(new ValidationPipe()) createSquareDto: CreateSquareDto,
  ) {
    const buffers: Buffer[] = files ? files.map((file) => file.buffer) : [];

    const { squareId } = await this.squareService.createSquare({
      ...createSquareDto,
      poll: {
        pollItems: createSquareDto.pollItems,
        canMultiple: createSquareDto.canMultiple,
      } as any,
      buffers,
    });
    return { squareId };
  }

  @Post('comment')
  async createSquareComment(
    @Body() commentDto: { comment: string; squareId: string },
  ) {
    await this.squareService.createSquareComment({
      comment: commentDto.comment,
      squareId: commentDto.squareId,
    });
    return { status: 'success' };
  }

  //todo: 왜안됨
  @Delete('comment')
  async deleteSquareComment(
    @Body() commentDto: { squareId: string; commentId: string },
  ) {
    await this.squareService.deleteSquareComment(commentDto);
    return { status: 'success' };
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
    await this.squareService.createSubComment(
      commentDto.squareId,
      commentDto.commentId,
      commentDto.comment,
    );
    return { status: 'success' };
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
    await this.squareService.deleteSubComment(
      commentDto.squareId,
      commentDto.commentId,
      commentDto.subCommentId,
    );
    return { status: 'success' };
  }

  @Delete(':squareId')
  async deleteSquare(@Param('squareId') squareId: string) {
    await this.squareService.deleteSquare(squareId);
    return { status: 'success' };
  }

  @Get(':squareId')
  async getSquare(@Param('squareId') squareId: string) {
    const square = await this.squareService.getSquare(squareId);
    return { square };
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
    await this.squareService.patchPoll({
      squareId,
      pollItems: pollDto.pollItems,
    });
    return { status: 'success' };
  }

  @Get(':squareId/poll')
  async getCurrentPollItems(@Param('squareId') squareId: string) {
    const currentPollItems = await this.squareService.getCurrentPollItems({
      squareId,
    });
    return { pollItems: currentPollItems };
  }

  @Put(':squareId/like')
  async putLikeSquare(@Param('squareId') squareId: string) {
    await this.squareService.putLikeSquare({ squareId });
    return { status: 'success' };
  }

  @Delete(':squareId/like')
  async deleteLikeSquare(@Param('squareId') squareId: string) {
    await this.squareService.deleteLikeSquare({ squareId });
    return { status: 'success' };
  }

  @Get(':squareId/like')
  async getIsLike(@Param('squareId') squareId: string) {
    const isLike = await this.squareService.getIsLike({ squareId });
    return { isLike };
  }

  @Post('comment/like')
  async setCommentLike(
    @Body('squareId') squareId: string,
    @Body('commentId') commentId: string,
  ) {
    await this.squareService.createCommentLike(squareId, commentId);
    return { status: 'success' };
  }

  @Post('subComment/like')
  async setSubCommentLike(
    @Body('squareId') squareId: string,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
  ) {
    await this.squareService.createSubCommentLike(
      squareId,
      commentId,
      subCommentId,
    );
    return { status: 'success' };
  }
}
