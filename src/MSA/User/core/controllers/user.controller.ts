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
  AddBadgeDto,
  PatchBelongDto,
  PatchIsLocationSharingDeniedDto,
  PatchIsPrivateDto,
  PatchLocationDetailDto,
  PatchRestDto,
  PatchRoleDto,
  SelectBadgeDto,
  SetFriendDto,
  SetMonthStudyTargetDto,
  SetPreferenceDto,
  UpdateAvatarDto,
  UpdateCommentDto,
  UpdateDepositDto,
  UpdateInstagramDto,
  UpdatePointDto,
  UpdateScoreDto,
  UpdateTicketDto,
} from '../../dtos/dto';
import { IUser } from '../../entity/user.entity';
import { UserService } from '../services/user.service';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

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

  @Patch('avatar')
  async updateAvatar(@Body() updateAvatarDto: UpdateAvatarDto) {
    await this.userService.updateUser({ avatar: updateAvatarDto });
    return { message: 'Avatar updated successfully' };
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
  async updateProfile(@Body() registerForm: Partial<IUser>) {
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

  @Get('monthScore')
  async getMonthScore() {
    const userScore = await this.userService.getUserInfo(['monthScore']);
    return userScore;
  }

  @Patch('locationDetail')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchLocationDetail(@Body() body: PatchLocationDetailDto) {
    await this.userService?.patchLocationDetail(
      body.name,
      body.address,
      body.latitude,
      body.longitude,
    );
    return;
  }

  @Patch('locationDetail/all')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchLocationDetailAll(@Body() body: any) {
    await this.userService?.patchLocationDetailAll();
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
      'create',
    );
  }

  @Get('membership/log')
  async getMembershipLog() {
    const logs = await this.userService.getMembershipLog();
    return logs;
  }

  @Patch('membership')
  async patchMembership(@Body('type') type: 'create' | 'decay') {
    await this.userService.patchMembership(type);
    return { message: 'Membership updated successfully' };
  }

  @Post('randomTicket')
  async postRandomTicket(@Body('userId') userId: string, @Body('number') number: number) {
    await this.userService.updateAddRandomTicket(userId, number);
    return { message: 'Random ticket updated successfully' };
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
