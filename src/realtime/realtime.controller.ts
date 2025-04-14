import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Injectable,
  Next,
  Patch,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { NextFunction, Response } from 'express';
import { memoryStorage } from 'multer';
import RealtimeService from './realtime.service';

@Injectable()
@ApiTags('realtime')
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
  @UseInterceptors(FilesInterceptor('images', 5, { storage: memoryStorage() }))
  async markAttendance(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
    @Body() markAttendanceDto: any,
  ) {
    try {
      const parsedPlace = JSON.parse(markAttendanceDto.place);
      const parsedTime = JSON.parse(markAttendanceDto.time);

      // 필요한 형태로 데이터 가공
      const parsedData = {
        ...markAttendanceDto,
        place: parsedPlace,
        time: parsedTime,
      };

      const buffers = files ? files.map((file) => file.buffer) : [];
      const updatedStudy = await this.realtimeService.markAttendance(
        parsedData,
        buffers,
      );
      return res.status(200).json(updatedStudy);
    } catch (err) {
      console.log(err);
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

  @Patch('time')
  async patchVote(
    @Body('start') start: string,
    @Body('end') end: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      await this.realtimeService.patchVote(start, end);
      return res.status(HttpStatus.OK).end();
    } catch (err) {
      next(err);
    }
  }

  //todo:route명 수정
  @Delete('cancel')
  async deleteVote(@Res() res: Response, @Next() next: NextFunction) {
    try {
      await this.realtimeService.deleteVote();
      return res.status(HttpStatus.NO_CONTENT).end();
    } catch (err) {
      next(err);
    }
  }

  @Patch('comment')
  async patchComment(
    @Body('comment') comment: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      await this.realtimeService.patchComment(comment);
      return res.status(HttpStatus.OK).end();
    } catch (err) {
      next(err);
    }
  }

  @Patch('status')
  async patchStatus(
    @Body('status') status: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const result = await this.realtimeService.patchStatus(status);
      return res.status(HttpStatus.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}
