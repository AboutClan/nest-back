import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateGatherDto,
  DeleteGatherDto,
  ExileGatherDto,
  HandleWaitingPersonDto,
  ParticipateGatherDto,
  SetWaitingPersonDto,
} from './dto';
import { gatherStatus } from './gather.entity';
import { GatherService } from './gather.service';

@ApiTags('gather')
@Controller('gather')
export class GatherController {
  constructor(private readonly gatherService: GatherService) {}

  @Get()
  async getGather(
    @Query('cursor') cursor?: string,
    @Query('gatherId') gatherId?: string,
    @Query('category') category?: '스터디' | '취미' | null,
    @Query('sortBy') sortBy?: 'createdAt' | 'date',
  ) {
    const cursorNum = cursor ? parseInt(cursor) : null;
    const gatherIdNum = gatherId ? parseInt(gatherId) : null;

    try {
      if (gatherIdNum) {
        return await this.gatherService.getGatherById(gatherIdNum);
      } else if (cursorNum === -1) {
        return await this.gatherService.getThreeGather();
      } else {
        return await this.gatherService.getGather(cursorNum, category, sortBy);
      }
    } catch (err) {
      throw new HttpException(
        'Error fetching gather data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  async getStatusGather(
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : null;

    try {
      return await this.gatherService.getStatusGather(status, cursorNum);
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
      console.log(err);
      throw new HttpException(
        'Error creating gather',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('exile')
  async exileGather(@Body() exileGatherDto: ExileGatherDto) {
    const { gatherId, userId } = exileGatherDto;

    await this.gatherService.exileGather(gatherId, userId);
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
        parseInt(setWaitingPersonDto.id),
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

  @Post('waiting/status')
  async handleWaitingPerson(
    @Body() handleWaitingPersonDto: HandleWaitingPersonDto,
  ) {
    const { id, userId, status, text } = handleWaitingPersonDto;
    await this.gatherService.handleWaitingPerson(id, userId, status, text);
    return { status: 'success' };
  }

  @Post('participate')
  async participateGather(@Body() participateGatherDto: ParticipateGatherDto) {
    await this.gatherService.participateGather(
      participateGatherDto.gatherId,
      participateGatherDto.phase,
      participateGatherDto.isFree,
    );
    return { status: 'success' };
  }

  @Post('invite')
  async inviteGather(@Body() inviteGatherDto: ParticipateGatherDto) {
    await this.gatherService.inviteGather(
      inviteGatherDto.gatherId,
      inviteGatherDto.phase,
      inviteGatherDto.userId,
    );
    return { status: 'success' };
  }

  @Delete('participate')
  async deleteParticipate(@Body() body: { gatherId: number }) {
    try {
      await this.gatherService.deleteParticipate(body.gatherId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment')
  async createComment(@Body() body: { id: string; comment: string }) {
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
  async deleteComment(@Body() body: { id: string; commentId: string }) {
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
    @Body() body: { id: string; commentId: string; comment: string },
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
    @Body() body: { gatherId: string; commentId: string; subCommentId: string },
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

  @Post('subComment')
  async createSubComment(
    @Body()
    body: {
      gatherId: string;
      commentId: string;
      comment: string;
    },
  ) {
    try {
      await this.gatherService.createSubComment(
        body.gatherId,
        body.commentId,
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

  @Patch('subComment')
  async updateSubComment(
    @Body()
    body: {
      gatherId: string;
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
    @Body() body: { gatherId: string; commentId: string; subCommentId: string },
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
  async setStatus(@Body() body: { gatherId: number; status: gatherStatus }) {
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

  @Get('enthMembers')
  async getEnthMembers() {
    try {
      return await this.gatherService.getEnthMembers();
    } catch (err) {
      throw new HttpException(
        'Error setting status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
