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
  Delete,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response, NextFunction } from 'express';
import { memoryStorage } from 'multer';
import { IREALTIME_SERVICE } from 'src/utils/di.tokens';
import { IRealtimeService } from './realtimeService';

@Injectable()
@Controller('realtime')
export class RealtimeController {
  constructor(
    @Inject(IREALTIME_SERVICE) private realtimeService: IRealtimeService,
  ) {}

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
