import {
  Body,
  Controller,
  Delete,
  Get,
  Next,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { NextFunction, Response } from 'express';
import { IUser } from 'src/routes/user/user.entity';
import AdminUserService from './adminUser.service';

export type UserFilterType = 'study';

// DTO for validation
class ValueDto {
  @IsNotEmpty()
  @IsNumber()
  value: string;

  message?: string;
}

@Controller('admin/user')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get('/')
  async getAllUser(@Query('type') type: UserFilterType, @Res() res: Response) {
    const allUser = await this.adminUserService.getAllUser(type);

    return res.status(200).json(allUser);
  }

  @Post('/')
  async updateProfile(@Body('profile') profile: IUser, @Res() res: Response) {
    await this.adminUserService.updateProfile(profile);
    return res.status(200).end();
  }

  @Post('/:id/point')
  async updatePoint(
    @Param('id') uid: string,
    @Body() { value, message }: ValueDto,
    @Res() res: Response,
  ) {
    await this.adminUserService.updateValue(uid, value, 'point', message);
    return res.status(200).end();
  }

  @Post('/:id/score')
  async updateScore(
    @Param('id') uid: string,
    @Body() { value, message }: ValueDto,
    @Res() res: Response,
  ) {
    await this.adminUserService.updateValue(uid, value, 'score', message);
    return res.status(200).end();
  }

  @Post('/:id/deposit')
  async updateDeposit(
    @Param('id') uid: string,
    @Body() { value, message }: ValueDto,
    @Res() res: Response,
  ) {
    await this.adminUserService.updateValue(uid, value, 'deposit', message);
    return res.status(200).end();
  }

  @Delete('/point')
  async deletePoint(@Res() res: Response) {
    await this.adminUserService.deletePoint();
    return res.status(200).end();
  }

  @Delete('/score')
  async deleteScore(@Res() res: Response) {
    await this.adminUserService.deleteScore();
    return res.status(200).end();
  }

  @Get('/:id/info')
  async getCertainUser(@Param('id') uid: string, @Res() res: Response) {
    const user = await this.adminUserService.getCertainUser(uid);
    return res.status(200).json(user);
  }

  @Patch('/:id/role')
  async setRole(
    @Param('id') uid: string,
    @Body('role') role: string,
    @Res() res: Response,
  ) {
    await this.adminUserService.setRole(role, uid);
    return res.status(200).end();
  }

  @Patch('/:id/belong')
  async updateBelong(
    @Param('id') uid: string,
    @Body('belong') belong: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      await this.adminUserService.updateBelong(uid, belong);
      return res.status(200).end();
    } catch (err) {
      next(err);
    }
  }

  // @Get('/test')
  // async resetAllUserRoles(@Res() res: Response) {
  //   await this.adminUserService.resetAllUserRoles('human');
  //   return res.status(200).end();
  // }
}
