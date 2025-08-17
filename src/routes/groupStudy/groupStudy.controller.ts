import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CommentDto,
  CreateGroupStudyDto,
  inviteGroupStudyDto,
  ParticipateGroupStudyDto,
} from './dto';
import { GroupStudyStatus } from './groupStudy.entity';
import { GroupStudyInterceptor } from './groupstudy.interceptor';
import GroupStudyService from './groupStudy.service';

@ApiTags('groupStudy')
@Controller('groupStudy')
@UseInterceptors(GroupStudyInterceptor)
export class GroupStudyController {
  constructor(private readonly groupStudyService: GroupStudyService) {}

  //todo: groupStudyId정도는 분리하는게 좋아보임
  @Get()
  async getGroupStudy(
    @Query('groupStudyId') groupStudyId?: string,
    @Query('filter') filter?: GroupStudyStatus,
    @Query('category') category?: string,
    @Query('cursor') cursor?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : 0;
    let groupStudyData;

    if (groupStudyId) {
      groupStudyData =
        await this.groupStudyService.getGroupStudyById(groupStudyId);
      return groupStudyData;
    } else if (filter) {
      if (category && category !== '전체') {
        groupStudyData =
          await this.groupStudyService.getGroupStudyByFilterAndCategory(
            filter,
            category,
            cursorNum,
          );
      } else {
        groupStudyData = await this.groupStudyService.getGroupStudyByFilter(
          filter,
          cursorNum,
        );
      }
      return groupStudyData;
    } else {
      groupStudyData = await this.groupStudyService.getGroupStudy(cursorNum);
      return groupStudyData;
    }
  }

  @Get('status')
  async getStatusGroupStudy(
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : 0;

    return await this.groupStudyService.getStatusGroupStudy(cursorNum, status);
  }

  //todo: groupStudy 조정 필요
  @Post()
  async createGroupStudy(@Body() createGroupStudyDto: CreateGroupStudyDto) {
    const groupStudyId = await this.groupStudyService.createGroupStudy(
      createGroupStudyDto.groupStudy,
    );
    return { groupStudyId };
  }

  @Patch()
  async updateGroupStudy(@Body() createGroupStudyDto: CreateGroupStudyDto) {
    await this.groupStudyService.updateGroupStudy(
      createGroupStudyDto.groupStudy,
    );
    return { status: 'success' };
  }

  @Get('study')
  async getGroupStudyOnlyStudy() {
    return await this.groupStudyService.getGroupStudyOnlyStudy();
  }

  @Get('snapshot')
  async getGroupStudySnapshot() {
    return await this.groupStudyService.getGroupStudySnapshot();
  }

  @Get('mine')
  async getSigningGroupByStatus(@Query('status') status?: string) {
    return await this.groupStudyService.getSigningGroupByStatus(status);
  }

  @Get('profile/:userId')
  async getUserGroupsTitleByUserId(@Param('userId') userId: string) {
    return await this.groupStudyService.getUserGroupsTitleByUserId(userId);
  }

  @Post('participate')
  async participateGroupStudy(
    @Body() participateGroupStudyDto: ParticipateGroupStudyDto,
  ) {
    await this.groupStudyService.participateGroupStudy(
      participateGroupStudyDto.id.toString(),
    );
    return { status: 'success' };
  }

  @Post('invite')
  async inviteGroupStudy(@Body() inviteGroupStudyDto: inviteGroupStudyDto) {
    await this.groupStudyService.inviteGroupStudy(
      inviteGroupStudyDto.id.toString(),
      inviteGroupStudyDto.userId.toString(),
    );
    return { status: 'success' };
  }

  @Delete('participate')
  async deleteParticipate(
    @Body() participateGroupStudyDto: ParticipateGroupStudyDto,
  ) {
    await this.groupStudyService.deleteParticipate(
      participateGroupStudyDto.id.toString(),
    );
    return { status: 'success' };
  }

  @Delete('participate/exile')
  async exileParticipate(
    @Body('id') id: string,
    @Body('toUid') toUid: string,
    @Body('randomId') randomId: number,
  ) {
    await this.groupStudyService.exileParticipate(id, toUid, randomId);
    return { status: 'success' };
  }

  @Get('comment')
  async getComment(
    @Query('type') type?: 'mine' | 'others',
    @Query('cursor') cursor?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : 0;
    await this.groupStudyService.getComment(type, cursorNum);
  }

  @Post('comment')
  async createComment(@Body() commentDto: CommentDto) {
    await this.groupStudyService.createComment(
      commentDto.id,
      commentDto.comment,
    );
    return { status: 'success' };
  }

  @Delete('comment')
  async deleteComment(
    @Body('id') id: string,
    @Body('commentId') commentId: string,
  ) {
    await this.groupStudyService.deleteComment(id, commentId);
    return { status: 'success' };
  }

  @Patch('comment')
  async patchComment(
    @Body('id') id: string,
    @Body('commentId') commentId: string,
    @Body('comment') comment: string,
  ) {
    await this.groupStudyService.patchComment(id, commentId, comment);
    return { status: 'success' };
  }

  @Post('comment/like')
  async createCommentLike(
    @Body('groupStudyId') groupStudyId: number,
    @Body('commentId') commentId: string,
  ) {
    await this.groupStudyService.createCommentLike(groupStudyId, commentId);
    return { status: 'success' };
  }

  @Patch('subComment')
  async updateSubComment(
    @Body()
    body: {
      groupStudyId: string;
      commentId: string;
      subCommentId: string;
      comment: string;
    },
  ) {
    await this.groupStudyService.updateSubComment(
      body.groupStudyId,
      body.commentId,
      body.subCommentId,
      body.comment,
    );
    return { status: 'success' };
  }

  @Delete('subComment')
  async DeleteSubComment(
    @Body()
    body: {
      groupStudyId: string;
      commentId: string;
      subCommentId: string;
    },
  ) {
    await this.groupStudyService.deleteSubComment(
      body.groupStudyId,
      body.commentId,
      body.subCommentId,
    );
    return { status: 'success' };
  }

  @Post('subComment')
  async createSubComment(
    @Body()
    body: {
      groupStudyId: string;
      commentId: string;
      comment: string;
    },
  ) {
    await this.groupStudyService.createSubComment(
      body.groupStudyId,
      body.commentId,
      body.comment,
    );
    return { status: 'success' };
  }

  @Post('subComment/like')
  async createSubCommentLike(
    @Body('groupStudyId') groupStudyId: number,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
  ) {
    await this.groupStudyService.createSubCommentLike(
      groupStudyId,
      commentId,
      subCommentId,
    );
    return { status: 'success' };
  }

  @Patch('attendance')
  async attendGroupStudy(
    @Body('id') id: string,
    @Body('weekRecord') weekRecord: string[],
    @Body('type') type: string,
    @Body('weekRecordSub') weekRecordSub: string[],
  ) {
    const result = await this.groupStudyService.attendGroupStudy(
      id,
      weekRecord,
      type,
      weekRecordSub,
    );
    return result;
  }

  @Patch('attendance/confirm')
  async patchAttendanceWeek(@Body('id') id: string) {
    const result = await this.groupStudyService.patchAttendanceWeek(id);
    return result;
  }

  @Patch('belong/match')
  async belongToParticipateGroupStudy() {
    const result = await this.groupStudyService.belongToParticipateGroupStudy();
    return result;
  }

  @Get('attendance/:id')
  async getAttendanceGroupStudy(@Param('id') id: string): Promise<any> {
    const result = await this.groupStudyService.getAttendanceGroupStudy(id);
    return result;
  }

  @Get('waiting/:id')
  async getWaitingPerson(@Param('id') id: string) {
    const result = await this.groupStudyService.getWaitingPerson(id);
    return result;
  }

  @Post('waiting')
  async setWaitingPerson(
    @Body('id') id: string,
    @Body('answer') answer: string[],
    @Body('pointType') pointType: string,
  ) {
    await this.groupStudyService.setWaitingPerson(id, pointType, answer);
    return { status: 'success' };
  }

  @Post('waiting/status')
  async agreeWaitingPerson(
    @Body('id') id: string,
    @Body('status') status: string,
    @Body('userId') userId: string,
  ) {
    await this.groupStudyService.agreeWaitingPerson(id, userId, status);
    return { status: 'success' };
  }

  @Post('monthAttend')
  async monthAttend(
    @Body('groupId') groupId: string,
    @Body('userId') userId: string,
    @Body('last') last: boolean = false,
  ) {
    await this.groupStudyService.monthAttend(groupId, userId, last);
    return { status: 'success' };
  }

  @Post('deposit')
  async depositGroupStudy(
    @Body('id') id: number,
    @Body('deposit') deposit: number,
  ) {
    await this.groupStudyService.depositGroupStudy(id, deposit);
    return { status: 'success' };
  }

  @Get('enthMembers')
  async getEnthMember() {
    return await this.groupStudyService.getEnthMembers();
  }

  @Get('test')
  async test() {
    await this.groupStudyService.test();
  }
}
