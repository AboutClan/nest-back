import {
  Controller,
  Post,
  Get,
  Patch,
  UseInterceptors,
  UploadedFiles,
  Body,
  Injectable,
  Res,
  Next,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response, NextFunction } from 'express';
import RealtimeService from './realtime.service';

@Injectable()
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Post('/basicVote')
  async createBasicVote(
    @Body() createBasicVoteDto: any,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const newStudy =
        await this.realtimeService.createBasicVote(createBasicVoteDto);
      return res.status(201).json(newStudy);
    } catch (err) {
      next(err);
    }
  }

  @Get()
  async getRealtime(@Res() res: Response, @Next() next: NextFunction) {
    try {
      const realtime = await this.realtimeService.getRecentStudy();
      return res.status(200).json(realtime);
    } catch (err) {
      next(err);
    }
  }

  @Post('/attendance')
  @UseInterceptors(FilesInterceptor('images', 5))
  async markAttendance(
    @Body() markAttendanceDto: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const buffers = files ? files.map((file) => file.buffer) : [];
      const updatedStudy = await this.realtimeService.markAttendance(
        markAttendanceDto,
        buffers,
      );
      return res.status(200).json(updatedStudy);
    } catch (err) {
      next(err);
    }
  }

  @Post('/directAttendance')
  @UseInterceptors(FilesInterceptor('images', 5))
  async directAttendance(
    @Body() markAttendanceDto: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const buffers = files ? files.map((file) => file.buffer) : [];
      const newStudy = await this.realtimeService.directAttendance(
        markAttendanceDto,
        buffers,
      );
      return res.status(201).json(newStudy);
    } catch (err) {
      next(err);
    }
  }

  @Patch()
  async updateStudy(
    @Body() updateStudyDto: any,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const updatedStudy =
        await this.realtimeService.updateStudy(updateStudyDto);
      if (updatedStudy) {
        return res.status(200).json(updatedStudy);
      } else {
        return res.status(404).json({ message: 'Study not found' });
      }
    } catch (err) {
      next(err);
    }
  }
}
