import {
  Controller,
  Delete,
  Patch,
  Get,
  Param,
  Query,
  Req,
  Res,
  Next,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import AdminVoteService from './adminVote.service';

@Controller('admin/vote')
export class AdminVoteController {
  constructor(private readonly adminVoteService: AdminVoteService) {}

  @Delete('/')
  async deleteVote(@Req() req: Request, @Res() res: Response) {
    await this.adminVoteService.deleteVote();
    return res.status(200).end();
  }

  @Patch('/:date/status/confirm')
  async confirmVoteStatus(
    @Param('date') dateStr: string,
    @Res() res: Response,
  ) {
    await this.adminVoteService.confirm(dateStr);
    return res.status(200).end();
  }

  @Patch('/:date/status/waitingConfirm')
  async waitingConfirmVoteStatus(
    @Param('date') dateStr: string,
    @Res() res: Response,
  ) {
    await this.adminVoteService.waitingConfirm(dateStr);
    return res.status(200).end();
  }

  @Patch('/:date/reset')
  async resetVoteStatus(
    @Param('date') dateStr: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      await this.adminVoteService.voteStatusReset(dateStr);
      return res.status(200).end();
    } catch (err) {
      next(err);
    }
  }

  @Get('/studyRecord')
  async getAdminStudyRecord(
    @Query('startDay') startDay: string,
    @Query('endDay') endDay: string,
    @Query('isAttend') isAttend: string,
    @Query('location') location: string,
    @Query('uid') uid: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const result = await this.adminVoteService.getAdminStudyRecord(
        startDay,
        endDay,
        isAttend,
        location,
        uid,
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
