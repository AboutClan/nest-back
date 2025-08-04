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
  async patchIsPrivate(@Body() body: { isPrivate: boolean }) {
    const { isPrivate } = body;

    await this.userService.updateUser({ isPrivate });
    return { message: 'Privacy setting updated successfully' };
  }

  @Patch('monthStudyTarget')
  async setMonthStudyTarget(@Body() body: { monthStudyTarget: number }) {
    const { monthStudyTarget } = body;

    await this.userService.updateUser({ monthStudyTarget });
    return { message: 'Privacy setting updated successfully' };
  }

  @Patch('isLocationSharingDenided')
  async patchIsLocationSharingDenided(
    @Body() body: { isLocationSharingDenided: boolean },
  ) {
    const { isLocationSharingDenided } = body;

    await this.userService.updateUser({ isLocationSharingDenided });
    return { message: 'Privacy setting updated successfully' };
  }

  //todo: info의 타입
  @Patch('rest')
  async patchRest(@Body() body: { info: any }) {
    await this.userService.setRest(body.info);
    return { message: 'Rest information updated successfully' };
  }

  @Get('voterate')
  async getVoteRate(@Query() query: { startDay: string; endDay: string }) {
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
  @Patch('point')
  async updateUserPoint(
    @Body() body: { point: number; message: string; sub: any },
  ) {
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
  async patchStudyTargetHour(@Body('hour') hour) {
    await this.userService?.patchStudyTargetHour(hour);
    return;
  }

  @Patch('locationDetail')
  async patchLocationDetail(
    @Body('text') text,
    @Body('lat') lat,
    @Body('lon') lon,
  ) {
    await this.userService?.patchLocationDetail(text, lat, lon);
    return;
  }

  @Post('badgeList')
  async addBadgeList(@Body('userId') userId, @Body('badgeName') badgeName) {
    await this.userService.addBadge(userId, badgeName);
    return;
  }
  @Patch('badge')
  async selectBadge(@Body('badgeIdx') badgeIdx) {
    await this.userService.selectBadge(badgeIdx);
    return;
  }
  @Post('profileImg')
  @UseInterceptors(FileInterceptor('image'))
  async updateProfileImg(@UploadedFile() file: Express.Multer.File) {}

  @Post('ticket')
  async updateTicket(
    @Req() req: Request,
    @Body('ticketNum') ticketNum,
    @Body('type')
    type: 'gather' | 'groupStudy' | 'groupOnline' | 'groupOffline',
  ) {
    await this.userService.updateAddTicket(
      type,
      req.decodedToken.id,
      ticketNum,
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
