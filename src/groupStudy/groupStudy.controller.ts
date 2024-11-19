import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IGROUPSTUDY_SERVICE } from 'src/utils/di.tokens';
import {
  CommentDto,
  CreateGroupStudyDto,
  ParticipateGroupStudyDto,
} from './dto';
import { GroupStudyStatus } from './entity/groupStudy.entity';
import { IGroupStudyService } from './groupStudyService.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('groupstudy')
@Controller('groupStudy')
export class GroupStudyController {
  constructor(
    @Inject(IGROUPSTUDY_SERVICE) private groupStudyService: IGroupStudyService,
  ) {}

  //todo: groupStudyId정도는 분리하는게 좋아보임
  @Get()
  async getGroupStudy(
    @Query('groupStudyId') groupStudyId?: string,
    @Query('filter') filter?: GroupStudyStatus,
    @Query('category') category?: string,
    @Query('cursor') cursor?: string,
  ) {
    try {
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
    } catch (err) {
      throw new HttpException(
        'Error fetching group study data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //todo: groupStudy 조정 필요
  @Post()
  async createGroupStudy(@Body() createGroupStudyDto: CreateGroupStudyDto) {
    try {
      const groupStudyId = await this.groupStudyService.createGroupStudy(
        createGroupStudyDto.groupStudy,
      );
      return { groupStudyId };
    } catch (err) {
      throw new HttpException(
        'Error creating group study',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch()
  async updateGroupStudy(@Body() createGroupStudyDto: CreateGroupStudyDto) {
    try {
      await this.groupStudyService.updateGroupStudy(
        createGroupStudyDto.groupStudy,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error updating group study',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      await this.groupStudyService.participateGroupStudy(
        participateGroupStudyDto.id.toString(),
      );
      return { status: 'success' };
    } catch (err) {
      console.log(err);
      throw new HttpException(
        'Error participating in group study',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('participate')
  async deleteParticipate(
    @Body() participateGroupStudyDto: ParticipateGroupStudyDto,
  ) {
    try {
      await this.groupStudyService.deleteParticipate(
        participateGroupStudyDto.id.toString(),
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting participation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('participate/exile')
  async exileParticipate(
    @Body('id') id: string,
    @Body('toUid') toUid: string,
    @Body('randomId') randomId: number,
  ) {
    try {
      await this.groupStudyService.exileParticipate(id, toUid, randomId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error exiling participant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment')
  async createComment(@Body() commentDto: CommentDto) {
    try {
      await this.groupStudyService.createComment(
        commentDto.id,
        commentDto.comment,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error creating comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('comment')
  async deleteComment(
    @Body('id') id: string,
    @Body('commentId') commentId: string,
  ) {
    try {
      await this.groupStudyService.deleteComment(id, commentId);
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
    @Body('id') id: string,
    @Body('commentId') commentId: string,
    @Body('comment') comment: string,
  ) {
    try {
      await this.groupStudyService.patchComment(id, commentId, comment);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error updating comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('comment/like')
  async createCommentLike(
    @Body('groupStudyId') groupStudyId: number,
    @Body('commentId') commentId: string,
  ) {
    try {
      await this.groupStudyService.createCommentLike(groupStudyId, commentId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error liking comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      await this.groupStudyService.updateSubComment(
        body.groupStudyId,
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
  async DeleteSubComment(
    @Body()
    body: {
      groupStudyId: string;
      commentId: string;
      subCommentId: string;
    },
  ) {
    try {
      await this.groupStudyService.deleteSubComment(
        body.groupStudyId,
        body.commentId,
        body.subCommentId,
      );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error updating sub-comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      await this.groupStudyService.createSubComment(
        body.groupStudyId,
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

  @Post('subComment/like')
  async createSubCommentLike(
    @Body('groupStudyId') groupStudyId: number,
    @Body('commentId') commentId: string,
    @Body('subCommentId') subCommentId: string,
  ) {
    try {
      await this.groupStudyService.createSubCommentLike(
        groupStudyId,
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

  @Patch('attendance')
  async attendGroupStudy(
    @Body('id') id: string,
    @Body('weekRecord') weekRecord: string[],
    @Body('type') type: string,
    @Body('weekRecordSub') weekRecordSub: string[],
  ) {
    try {
      const result = await this.groupStudyService.attendGroupStudy(
        id,
        weekRecord,
        type,
        weekRecordSub,
      );
      return result;
    } catch (err) {
      throw new HttpException(
        'Error recording attendance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('attendance/confirm')
  async patchAttendanceWeek(@Body('id') id: string) {
    try {
      const result = await this.groupStudyService.patchAttendanceWeek(id);
      return result;
    } catch (err) {
      throw new HttpException(
        'Error confirming attendance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('belong/match')
  async belongToParticipateGroupStudy() {
    try {
      const result =
        await this.groupStudyService.belongToParticipateGroupStudy();
      return result;
    } catch (err) {
      throw new HttpException(
        'Error matching participation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('attendance/:id')
  async getAttendanceGroupStudy(@Param('id') id: string): Promise<any> {
    try {
      const result = await this.groupStudyService.getAttendanceGroupStudy(id);
      return result;
    } catch (err) {
      throw new HttpException(
        'Error fetching attendance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('waiting/:id')
  async getWaitingPerson(@Param('id') id: string) {
    try {
      const result = await this.groupStudyService.getWaitingPerson(id);
      return result;
    } catch (err) {
      throw new HttpException(
        'Error fetching waiting person',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('waiting')
  async setWaitingPerson(
    @Body('id') id: string,
    @Body('answer') answer: string,
    @Body('pointType') pointType: string,
  ) {
    try {
      await this.groupStudyService.setWaitingPerson(id, pointType, answer);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error setting waiting person',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('waiting/status')
  async agreeWaitingPerson(
    @Body('id') id: string,
    @Body('status') status: string,
    @Body('userId') userId: string,
  ) {
    try {
      await this.groupStudyService.agreeWaitingPerson(id, userId, status);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException('Error agreeing waiting person', 500);
    }
  }
}
