import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  Response,
  UsePipes,
  ValidationPipe,
  Delete,
  Inject,
} from '@nestjs/common';
import {
  UpdateAvatarDto,
  UpdateCommentDto,
  UpdateInstagramDto,
  PatchRoleDto,
  SetPreferenceDto,
  SetPromotionDto,
  SetFriendDto,
  PatchBelongDto,
} from './dto';
import { IUserService } from './userService.interface';
import { IUSER_SERVICE } from 'src/utils/di.tokens';

@Controller('user')
export class UserController {
  constructor(@Inject(IUSER_SERVICE) private userService: IUserService) {}

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
  @UsePipes(new ValidationPipe({ transform: true }))
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
  async patchIsPrivate(@Body() body: { isPrivate: boolean }) {
    const { isPrivate } = body;

    await this.userService.updateUser({ isPrivate });
    return { message: 'Privacy setting updated successfully' };
  }

  //todo: info의 타입
  @Patch('rest')
  async patchRest(@Body() body: { info: any }) {
    await this.userService.setRest(body.info);
    return { message: 'Rest information updated successfully' };
  }

  @Get('participationrate/all')
  async getParticipationRateAll(
    @Query()
    query: {
      startDay: string;
      endDay: string;
      location: string | null;
      summary: boolean;
    },
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
  async getParticipationRate(
    @Query()
    query: {
      startDay: string;
      endDay: string;
      location: string | null;
      summary: boolean;
    },
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
  async getVoteRate(@Query() query: { startDay: string; endDay: string }) {
    const voteResult = await this.userService.getVoteRate(
      query.startDay,
      query.endDay,
    );
    return voteResult;
  }

  @Get('profile/:uid')
  async getUserByUid(@Param('uid') uid: string) {
    const isActive = await this.userService.getUserWithUid(uid);
    return isActive;
  }

  @Get('profile')
  async getProfile() {
    const targetUser = await this.userService.getUserInfo([]);
    return targetUser;
  }

  @Post('profile')
  async updateProfile(@Body() registerForm: any) {
    const updatedUser = await this.userService.updateUser(registerForm);
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

  @Post('promotion')
  @UsePipes(new ValidationPipe({ transform: true }))
  async setPromotion(@Body() setPromotionDto: SetPromotionDto) {
    await this.userService.setPromotion(setPromotionDto.name);
    return { message: 'Promotion set successfully' };
  }

  @Get('promotion')
  async getPromotion() {
    const promotionData = await this.userService.getPromotion();
    return promotionData;
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
  async updateUserDeposit(
    @Body() body: { deposit: number; message: string; sub: any },
  ) {
    await this.userService.updateDeposit(body.deposit, body.message, body.sub);
    return { message: 'Deposit updated successfully' };
  }

  @Get('deposit')
  async getUserDeposit() {
    const userDeposit = await this.userService.getUserInfo(['deposit']);
    return userDeposit;
  }

  @Patch('score')
  async updateUserScore(
    @Body() body: { score: number; message: string; sub: any },
  ) {
    await this.userService.updateScore(body.score, body.message, body.sub);
    return { message: 'Score updated successfully' };
  }

  @Get('score')
  async getUserScore() {
    const userScore = await this.userService.getUserInfo(['score']);
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

  @Patch('score/all')
  async updateAllUserScores() {
    await this.userService.updateUserAllScore();
    return { message: 'All user scores updated successfully' };
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
}
