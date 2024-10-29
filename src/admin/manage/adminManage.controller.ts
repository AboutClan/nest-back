import { Controller, Patch, Req, Res, Next } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import AdminManageService from './adminManage.service';

@Controller('admin/manage')
export class AdminManageController {
  constructor(private readonly adminManageService: AdminManageService) {}

  @Patch('/dayCalc')
  async calculateAbsence(@Res() res: Response, @Next() next: NextFunction) {
    try {
      await this.adminManageService.absenceManage();
      return res.status(200).end();
    } catch (err) {
      next(err);
    }
  }

  @Patch('/monthCalc')
  async calculateMonthly(@Res() res: Response, @Next() next: NextFunction) {
    try {
      const result = await this.adminManageService.monthCalc();
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
