import {
  Body,
  Controller,
  Delete,
  Get,
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

    if (gatherIdNum) {
      return await this.gatherService.getGatherById(gatherIdNum);
    } else if (cursorNum === -1) {
      return await this.gatherService.getThreeGather();
    } else {
      return await this.gatherService.getGather(cursorNum, category, sortBy);
    }
  }

  @Get('status')
  async getStatusGather(
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : null;

    return await this.gatherService.getStatusGather(status, cursorNum);
  }

  @Post()
  async createGather(@Body() createGatherDto: CreateGatherDto) {
    const gatherId = await this.gatherService.createGather(
      createGatherDto.gather,
    );

    return { gatherId };
  }

  @Post('exile')
  async exileGather(@Body() exileGatherDto: ExileGatherDto) {
    const { gatherId, userId } = exileGatherDto;

    await this.gatherService.exileGather(gatherId, userId);
  }

  @Delete()
  async deleteGather(@Body() deleteGatherDto: DeleteGatherDto) {
    const gatherData = await this.gatherService.deleteGather(
      deleteGatherDto.gatherId,
    );
  
    return gatherData;
  }

  @Patch()
  async updateGather(@Body() updateGatherDto: any) {
    await this.gatherService.updateGather(updateGatherDto.gather);
    return { status: 'success' };
  }

  @Post('waiting')
  async setWaitingPerson(@Body() setWaitingPersonDto: SetWaitingPersonDto) {
    await this.gatherService.setWaitingPerson(
      parseInt(setWaitingPersonDto.id),
      setWaitingPersonDto.phase,
    );
    return { status: 'success' };
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
    await this.gatherService.deleteParticipate(body.gatherId);
    return { status: 'success' };
  }

  @Post('comment')
  async createComment(@Body() body: { id: string; comment: string }) {
    await this.gatherService.createComment(body.id, body.comment);
    return { status: 'success' };
  }

  @Delete('comment')
  async deleteComment(@Body() body: { id: string; commentId: string }) {
    await this.gatherService.deleteComment(body.id, body.commentId);
    return { status: 'success' };
  }

  @Patch('comment')
  async patchComment(
    @Body() body: { id: string; commentId: string; comment: string },
  ) {
    await this.gatherService.patchComment(
      body.id,
      body.commentId,
      body.comment,
    );
    return { status: 'success' };
  }

  @Post('comment/like')
  async createCommentLike(
    @Body() body: { gatherId: number; commentId: string },
  ) {
    await this.gatherService.createCommentLike(body.gatherId, body.commentId);
    return { status: 'success' };
  }

  @Post('subComment/like')
  async createSubCommentLike(
    @Body() body: { gatherId: string; commentId: string; subCommentId: string },
  ) {
    await this.gatherService.createSubCommentLike(
      body.gatherId,
      body.commentId,
      body.subCommentId,
    );
    return { status: 'success' };
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
    await this.gatherService.createSubComment(
      body.gatherId,
      body.commentId,
      body.comment,
    );
    return { status: 'success' };
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
    await this.gatherService.updateSubComment(
      body.gatherId,
      body.commentId,
      body.subCommentId,
      body.comment,
    );
    return { status: 'success' };
  }

  @Delete('subComment')
  async deleteSubComment(
    @Body() body: { gatherId: string; commentId: string; subCommentId: string },
  ) {
    await this.gatherService.deleteSubComment(
      body.gatherId,
      body.commentId,
      body.subCommentId,
    );
    return { status: 'success' };
  }

  @Patch('status')
  async setStatus(@Body() body: { gatherId: number; status: gatherStatus }) {
    await this.gatherService.setStatus(body.gatherId, body.status);
    return { status: 'success' };
  }

  @Get('enthMembers')
  async getEnthMembers() {
    return await this.gatherService.getEnthMembers();
  }
}
