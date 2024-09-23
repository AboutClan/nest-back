import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GatherService } from '../services/gatherService';
import { IsNotEmpty, IsNumeric, IsString } from 'class-validator';

@Controller('gather')
export class GatherController {
  constructor(private readonly gatherService: GatherService) {}

  @Get()
  async getGather(
    @Query('cursor') cursor?: string,
    @Query('gatherId') gatherId?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : null;
    const gatherIdNum = gatherId ? parseInt(gatherId) : null;

    try {
      if (gatherIdNum) {
        return await this.gatherService.getGatherById(gatherIdNum);
      } else if (cursorNum === -1) {
        return await this.gatherService.getThreeGather();
      } else {
        return await this.gatherService.getGather(cursorNum);
      }
    } catch (err) {
      throw new HttpException(
        'Error fetching gather data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createGather(@Body() createGatherDto: CreateGatherDto) {
    try {
      const gatherId = await this.gatherService.createGather(
        createGatherDto.gather,
      );
      return { gatherId };
    } catch (err) {
      throw new HttpException(
        'Error creating gather',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete()
  async deleteGather(@Body() deleteGatherDto: DeleteGatherDto) {
    try {
      const gatherData = await this.gatherService.deleteGather(
        deleteGatherDto.gatherId,
      );
      return gatherData;
    } catch (err) {
      throw new HttpException(
        'Error deleting gather',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch()
  async updateGather(@Body() updateGatherDto: any) {
    try {
      await this.gatherService.updateGather(updateGatherDto.gather);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error updating gather',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('waiting')
  async setWaitingPerson(@Body() setWaitingPersonDto: SetWaitingPersonDto) {
    try {
      await this.gatherService.setWaitingPerson(
        setWaitingPersonDto.id,
        setWaitingPersonDto.phase,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error setting waiting person',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('participate')
  async participateGather(@Body() participateGatherDto: ParticipateGatherDto) {
    try {
      await this.gatherService.participateGather(
        participateGatherDto.gatherId,
        participateGatherDto.phase,
        participateGatherDto.userId,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error participating in gather',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment')
  async createComment(@Body() body: { id: number; comment: string }) {
    try {
      await this.gatherService.createComment(body.id, body.comment);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error creating comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('comment')
  async deleteComment(@Body() body: { id: number; commentId: string }) {
    try {
      await this.gatherService.deleteComment(body.id, body.commentId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('comment')
  async patchComment(
    @Body() body: { id: number; commentId: string; comment: string },
  ) {
    try {
      await this.gatherService.patchComment(
        body.id,
        body.commentId,
        body.comment,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error patching comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment/like')
  async createCommentLike(
    @Body() body: { gatherId: number; commentId: string },
  ) {
    try {
      await this.gatherService.createCommentLike(body.gatherId, body.commentId);
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
    @Body() body: { gatherId: number; commentId: string; subCommentId: string },
  ) {
    try {
      await this.gatherService.createSubCommentLike(
        body.gatherId,
        body.commentId,
        body.subCommentId,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error liking sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('subComment')
  async updateSubComment(
    @Body()
    body: {
      gatherId: number;
      commentId: string;
      subCommentId: string;
      comment: string;
    },
  ) {
    try {
      await this.gatherService.updateSubComment(
        body.gatherId,
        body.commentId,
        body.subCommentId,
        body.comment,
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
    @Body() body: { gatherId: number; commentId: string; subCommentId: string },
  ) {
    try {
      await this.gatherService.deleteSubComment(
        body.gatherId,
        body.commentId,
        body.subCommentId,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('status')
  async setStatus(@Body() body: { gatherId: number; status: string }) {
    try {
      await this.gatherService.setStatus(body.gatherId, body.status);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error setting status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
