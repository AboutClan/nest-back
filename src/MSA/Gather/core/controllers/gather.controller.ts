import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Public } from 'src/decorator/Public';
import { GeneratePostDraftDto } from 'src/utils/gpt/content-draft.dto';
import { assertGatherFormSyncKey } from 'src/utils/internalAuth';
import {
  CreateGatherDto,
  DeleteGatherDto,
  ExileGatherDto,
  HandleWaitingPersonDto,
  InviteDummyGatherDto,
  ParticipateGatherDto,
  SetWaitingPersonDto,
} from '../../dtos/dto';
import { gatherStatus } from '../../entity/gather.entity';
import { FormResponseInput } from '../domain/Gather/regularFormMatcher';
import { GatherAbsenceType } from '../domain/Gather/Participants';
import { GatherService } from '../services/gather.service';
@ApiTags('gather')
@Controller('gather')
export class GatherController {
  constructor(private readonly gatherService: GatherService) {}

  @Get()
  async getGather(
    @Query('cursor') cursor?: string,
    @Query('gatherId') gatherId?: string,
    @Query('category') category?: '모집중' | '마감 임박' | '인기 모임' | null,
    @Query('sortBy') sortBy?: 'createdAt' | 'date' | 'basic',
    @Query('mode') mode?: 'future' | 'past',
  ) {
    const cursorNum = cursor ? parseInt(cursor) : null;
    const gatherIdNum = gatherId ? parseInt(gatherId) : null;
    if (gatherIdNum) {
      return await this.gatherService.getGatherById(gatherIdNum);
    } else if (cursorNum === -1) {
      return await this.gatherService.getHomeGatherSections();
    } else {
      return await this.gatherService.getGather(
        cursorNum,
        category,
        sortBy,
        mode,
      );
    }
  }

  // 공개 페이지(/gather/[id]/p) 공유 미리보기용 OG. 로그인 없이 부르며, 구글폼이 있는 공개 모임의 제목·설명·이미지만 준다.
  @Public()
  @Get('og')
  async getGatherOg(@Query('gatherId') gatherId: string) {
    const id = parseInt(gatherId);
    if (!id) throw new BadRequestException('gatherId required');
    return await this.gatherService.getGatherOg(id);
  }

  // 상시 행사에서 확정돼 따로 만든 모임 목록
  @Get('children')
  async getChildGathers(@Query('parentGatherId') parentGatherId: string) {
    const id = parseInt(parentGatherId);
    if (!id) throw new BadRequestException('parentGatherId required');
    return await this.gatherService.getChildGathers(id);
  }

  // 상시 행사 관리 화면: 회차(또는 콘텐츠)로 확정 모임을 만들고 선택한 회원을 초대 참여자로 넣는다.
  @Post('regular/confirm')
  async createConfirmedGather(
    @Body()
    body: {
      parentGatherId: number;
      optionKey: string;
      date: string;
      title: string;
      userIds: string[];
    },
  ) {
    const gatherId = await this.gatherService.createConfirmedGather(body);
    return { gatherId };
  }

  // Apps Script(구글폼 응답 시트) → 상시 행사 회차별 신청 집계. 사용자 JWT 대신 내부 키로 인증.
  @Public()
  @Post('regular/form-stats')
  async updateFormStats(
    @Headers('x-internal-key') key: string,
    @Body()
    body: {
      gatherId: number;
      responses?: FormResponseInput[];
    },
  ) {
    assertGatherFormSyncKey(key);
    await this.gatherService.updateFormStats(body);
    return { status: 'success' };
  }

  @Get('group')
  async getGatherByGroup(
    @Query('groupId') groupId: string,
    @Query('type') type?: string,
  ) {
    return await this.gatherService.getGatherGroup(groupId, type);
  }

  @Get('count')
  async getGatherCount(@Query('userId') userId?: string) {
    return await this.gatherService.getGatherCount(userId);
  }

  @Get('status')
  async getStatusGather(
    @Query('cursor') cursor?: string,
    @Query('userId') userId?: string,
  ) {
    const cursorNum = cursor ? parseInt(cursor) : null;

    return await this.gatherService.getStatusGather(cursorNum, userId);
  }

  @Get('review')
  async getReviewGather() {
    return await this.gatherService.getReviewGather();
  }

  @Post('ai/draft')
  async generatePostDraft(@Body() body: GeneratePostDraftDto) {
    return await this.gatherService.generatePostDraft(body.text);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 },
      ],
      { storage: memoryStorage() },
    ),
  )
  async createGather(
    @Body() createGatherDto: CreateGatherDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
  ) {
    // multipart/form-data로 전송될 때 gather 필드가 JSON 문자열로 올 수 있음
    const gatherData =
      typeof createGatherDto.gather === 'string'
        ? JSON.parse(createGatherDto.gather)
        : createGatherDto.gather;

    const gatherId = await this.gatherService.createGather(gatherData, {
      image: files?.image?.[0]?.buffer,
      coverImage: files?.coverImage?.[0]?.buffer,
    });

    return { gatherId };
  }

  @Patch()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 },
      ],
      { storage: memoryStorage() },
    ),
  )
  async updateGather(
    @Body() updateGatherDto: any,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
  ) {
    // multipart/form-data로 전송될 때 gather 필드가 JSON 문자열로 올 수 있음
    const gatherData =
      typeof updateGatherDto.gather === 'string'
        ? JSON.parse(updateGatherDto.gather)
        : updateGatherDto.gather;

    await this.gatherService.updateGather(gatherData, {
      image: files?.image?.[0]?.buffer,
      coverImage: files?.coverImage?.[0]?.buffer,
    });
    return { status: 'success' };
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

  @Post('openGather')
  async voteOpenGatherMember(
    @Body('infos') infos: { toUid: string; type: 'good' | 'bad' }[],
    @Body('gatherId') gatherId: string,
  ) {
    await this.gatherService.voteOpenGatherMember(infos, gatherId);
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
      participateGatherDto.selectedDates,
      participateGatherDto.withCompanion,
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

  @Post('invite/dummy')
  async inviteDummyGather(@Body() inviteDummyGatherDto: InviteDummyGatherDto) {
    await this.gatherService.inviteDummyGather(
      inviteDummyGatherDto.gatherId,
      inviteDummyGatherDto.phase,
      inviteDummyGatherDto.name,
      inviteDummyGatherDto.gender,
      inviteDummyGatherDto.birth,
    );
    return { status: 'success' };
  }

  @Post('absence')
  async setAbsence(
    @Body('userId') userId: string,
    @Body('gatherId') gatherId: number,
    @Body('type') type?: GatherAbsenceType,
  ) {
    await this.gatherService.setAbsence(userId, gatherId, type);
    return { status: 'success' };
  }

  @Delete('participate')
  async deleteParticipate(@Body() body: { gatherId: number; userId: string }) {
    await this.gatherService.deleteParticipate(body.gatherId, body.userId);
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

  @Get('test')
  async test() {
    return await this.gatherService.test();
  }
}
