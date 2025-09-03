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
  Req,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
  PatchBelongDto,
  PatchRoleDto,
  SetFriendDto,
  SetPreferenceDto,
  UpdateAvatarDto,
  UpdateCommentDto,
  UpdateInstagramDto,
  PatchIsPrivateDto,
  SetMonthStudyTargetDto,
  PatchIsLocationSharingDeniedDto,
  PatchRestDto,
  ParticipationRateQueryDto,
  VoteRateQueryDto,
  UpdateProfileDto,
  UpdateDepositDto,
  UpdateScoreDto,
  UpdatePointDto,
  PatchStudyTargetHourDto,
  PatchLocationDetailDto,
  AddBadgeDto,
  SelectBadgeDto,
  UpdateTicketDto,
} from './dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('active')
  async getActive() {
    const isActive = await this.userService.getUserInfo(['isActive']);
    return isActive;
  }

  @Get('simple')
  async getSimple() {
    const simpleUserInfo = await this.userService.getSimpleUserInfo();
    return simpleUserInfo;
  }

  @Get('simpleAll')
  async getAllSimple() {
    const allSimpleUserInfo = await this.userService.getAllSimpleUserInfo();
    return allSimpleUserInfo;
  }

  @Patch('avatar')
  async updateAvatar(@Body() updateAvatarDto: UpdateAvatarDto) {
    await this.userService.updateUser({ avatar: updateAvatarDto });
    return { message: 'Avatar updated successfully' };
  }

  //todo: 사용처 궁금
  @Get('comment')
  async getAllComments() {
    const comments = await this.userService.getAllUserInfo(['comment', 'name']);
    return comments;
  }

  @Patch('comment')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateComment(@Body() updateCommentDto: UpdateCommentDto) {
    await this.userService.updateUser({ comment: updateCommentDto.comment });
    return { message: 'Comment updated successfully' };
  }

  @Patch('instagram')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateInstagram(@Body() updateInstagramDto: UpdateInstagramDto) {
    await this.userService.updateUser({
      instagram: updateInstagramDto.instagram,
    });
    return { message: 'Instagram updated successfully' };
  }

  @Patch('role')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchRole(@Body() patchRoleDto: PatchRoleDto) {
    await this.userService.patchRole(patchRoleDto.role);
    return { message: 'Role updated successfully' };
  }

  //todo: boolean값 들어오는지 check
  @Patch('isPrivate')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchIsPrivate(@Body() body: PatchIsPrivateDto) {
    const { isPrivate } = body;

    await this.userService.updateUser({ isPrivate });
    return { message: 'Privacy setting updated successfully' };
  }

  @Patch('monthStudyTarget')
  @UsePipes(new ValidationPipe({ transform: true }))
  async setMonthStudyTarget(@Body() body: SetMonthStudyTargetDto) {
    const { monthStudyTarget } = body;

    await this.userService.updateUser({ monthStudyTarget });
    return { message: 'Month study target updated successfully' };
  }

  @Patch('isLocationSharingDenided')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchIsLocationSharingDenided(
    @Body() body: PatchIsLocationSharingDeniedDto,
  ) {
    const { isLocationSharingDenided } = body;

    await this.userService.updateUser({ isLocationSharingDenided });
    return { message: 'Location sharing setting updated successfully' };
  }

  //todo: info의 타입
  @Patch('rest')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchRest(@Body() body: PatchRestDto) {
    await this.userService.setRest(body.info);
    return { message: 'Rest information updated successfully' };
  }

  @Get('participationrate/all')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getParticipationRateAll(
    @Query()
    query: ParticipationRateQueryDto,
  ) {
    const participationResult = await this.userService.getParticipationRate(
      query.startDay,
      query.endDay,
      true,
      query.location,
      query.summary,
    );
    return participationResult;
  }

  @Get('participationrate')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getParticipationRate(
    @Query()
    query: ParticipationRateQueryDto,
  ) {
    const participationResult = await this.userService.getParticipationRate(
      query.startDay,
      query.endDay,
      false,
      query.location,
      query.summary,
    );
    return participationResult;
  }

  @Get('voterate')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getVoteRate(@Query() query: VoteRateQueryDto) {
    const voteResult = await this.userService.getVoteRate(
      query.startDay,
      query.endDay,
    );
    return voteResult;
  }

  @Get('profile/:userId')
  async getUserByUid(@Param('userId') userId: string) {
    const isActive = await this.userService.getUserWithUserId(userId);
    return isActive;
  }

  @Get('profiles')
  async getUserByUids(@Query('uids') uids: string[]) {
    const isActive = await this.userService.getUsersWithUids(uids);
    return isActive;
  }

  @Get('profile')
  async getProfile() {
    const targetUser = await this.userService.getUserInfo([]);
    return targetUser;
  }

  @Post('profile')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateProfile(@Body() registerForm: UpdateProfileDto) {
    const updatedUser = await this.userService.updateUser(
      registerForm.registerForm,
    );
    return updatedUser;
  }

  @Patch('profile')
  async patchProfile() {
    const updatedUser = await this.userService.patchProfile();
    return updatedUser;
  }

  @Patch('belong')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchBelong(@Body() patchBelongDto: PatchBelongDto) {
    const { uid, belong } = patchBelongDto;
    await this.userService.patchBelong(uid, belong);
    return { message: 'Belong updated successfully' };
  }

  @Post('preference')
  @UsePipes(new ValidationPipe({ transform: true }))
  async setPreference(@Body() setPreferenceDto: SetPreferenceDto) {
    const { place, subPlace } = setPreferenceDto;

    await this.userService.setPreference(place, subPlace);
    return { message: 'Preference updated successfully' };
  }

  @Get('preference')
  async getPreference() {
    const result = await this.userService.getPreference();
    return result;
  }

  @Get('friend')
  async getFriend() {
    const friend = await this.userService.getUserInfo(['friend']);
    return friend;
  }

  @Patch('friend')
  @UsePipes(new ValidationPipe({ transform: true }))
  async setFriend(@Body() setFriendDto: SetFriendDto) {
    await this.userService.setFriend(setFriendDto.toUid);
    return { message: 'Friend added successfully' };
  }

  @Delete('friend')
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteFriend(@Body() setFriendDto: SetFriendDto) {
    await this.userService.deleteFriend(setFriendDto.toUid);
    return { message: 'Friend deleted successfully' };
  }

  @Patch('deposit')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUserDeposit(@Body() body: UpdateDepositDto) {
    await this.userService.updateDeposit(body.deposit, body.message, body.sub);
    return { message: 'Deposit updated successfully' };
  }

  @Get('deposit')
  async getUserDeposit() {
    const userDeposit = await this.userService.getUserInfo(['deposit']);
    return userDeposit;
  }

  @Patch('score')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUserScore(@Body() body: UpdateScoreDto) {
    await this.userService.updateScore(body.score, body.message, body.sub);
    return { message: 'Score updated successfully' };
  }
  @Patch('point')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUserPoint(@Body() body: UpdatePointDto) {
    await this.userService.updatePoint(body.point, body.message, body.sub);
    return { message: 'Point updated successfully' };
  }

  @Get('score')
  async getUserScore() {
    const userScore = await this.userService.getUserInfo(['score']);
    return userScore;
  }
  @Get('point')
  async getUserPoint() {
    const userScore = await this.userService.getUserInfo(['point']);
    return userScore;
  }

  @Get('histories/score')
  async getScoreLogs() {
    const logs = await this.userService.getLog('score');
    return logs;
  }

  @Get('histories/monthScore')
  async getMonthScoreLogs() {
    const logs = await this.userService.getMonthScoreLog();
    return logs;
  }

  @Get('histories/score/all')
  async getAllScoreLogs() {
    const logs = await this.userService.getAllLog('score');
    return logs;
  }

  @Get('histories/point')
  async getPointLogs() {
    const logs = await this.userService.getLog('point');
    return logs;
  }

  @Get('histories/point/all')
  async getAllPointLogs() {
    const logs = await this.userService.getAllLog('point');
    return logs;
  }

  @Get('monthScore')
  async getMonthScore() {
    const userScore = await this.userService.getUserInfo(['monthScore']);
    return userScore;
  }

  @Delete('monthScore')
  async initMonthScore() {
    await this.userService.initMonthScore();
    return { message: 'Month score reset successfully' };
  }

  @Get('score/all')
  async getAllUserScores() {
    const userScores = await this.userService.getAllUserInfo([
      'name',
      'score',
      'location',
      'uid',
    ]);
    return userScores;
  }

  @Get('deposit/all')
  async getAllUserDeposits() {
    const userDeposits = await this.userService.getAllUserInfo([
      'name',
      'deposit',
      'uid',
    ]);
    return userDeposits;
  }

  @Patch('weekStudyTargetHour')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchStudyTargetHour(@Body() body: PatchStudyTargetHourDto) {
    await this.userService?.patchStudyTargetHour(body.hour);
    return;
  }

  @Patch('locationDetail')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchLocationDetail(@Body() body: PatchLocationDetailDto) {
    await this.userService?.patchLocationDetail(body.text, body.lat, body.lon);
    return;
  }

  @Patch('locationDetail/all')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchLocationDetailAll(@Body() body: PatchLocationDetailDto) {
    await this.userService?.patchLocationDetailAll(
      body.text,
      body.lat,
      body.lon,
    );
    return;
  }

  @Post('badgeList')
  @UsePipes(new ValidationPipe({ transform: true }))
  async addBadgeList(@Body() body: AddBadgeDto) {
    await this.userService.addBadge(body.userId, body.badgeName);
    return;
  }
  @Patch('badge')
  @UsePipes(new ValidationPipe({ transform: true }))
  async selectBadge(@Body() body: SelectBadgeDto) {
    await this.userService.selectBadge(body.badgeIdx);
    return;
  }
  @Post('profileImg')
  @UseInterceptors(FileInterceptor('image'))
  async updateProfileImg(@UploadedFile() file: Express.Multer.File) {
    // TODO: 프로필 이미지 업데이트 로직 구현
    return { message: 'Profile image uploaded successfully' };
  }

  @Post('ticket')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateTicket(@Req() req: Request, @Body() body: UpdateTicketDto) {
    await this.userService.updateAddTicket(
      body.type,
      req.decodedToken.id,
      body.ticketNum,
    );
  }

  @Get('test')
  async test() {
    try {
      return await this.userService.test();
    } catch (err) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
