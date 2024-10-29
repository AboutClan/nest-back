import { Controller, Delete, Param, Res, Next } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import AdminLogService from './adminLog.service';

@Controller('admin-log')
export class AdminLogController {
  constructor(private readonly adminLogService: AdminLogService) {}

  @Delete('/delete/:day')
  async deleteLog(
    @Param('day') day: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      await this.adminLogService.deleteLog(parseInt(day, 10));
      return res.status(200).end();
    } catch (err) {
      next(err);
    }
  }
}
