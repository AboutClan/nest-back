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
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import { memoryStorage } from 'multer';
import RealtimeService from './realtime.service';

@Injectable()
@ApiTags('realtime')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Post(':date/basicVote')
  async createBasicVote(
    @Body() createBasicVoteDto: any,
    @Res() res: Response,
    @Req() req: Request,
    @Next() next: NextFunction,
  ) {
    const { date } = req;

    const newStudy = await this.realtimeService.createBasicVote(
      createBasicVoteDto,
      date as string,
    );
    return res.status(201).json(newStudy);
  }

  @Get(':date')
  async getRealtime(
    @Res() res: Response,
    @Req() req: Request,
    @Next() next: NextFunction,
  ) {
    const { date } = req;
    const realtime = await this.realtimeService.getRecentStudy(date as string);
    return res.status(200).json(realtime);
  }

  @Post(':date/attendance')
  @UseInterceptors(FilesInterceptor('images', 5, { storage: memoryStorage() }))
  async markAttendance(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
    @Req() req: Request,
    @Body() markAttendanceDto: any,
  ) {
    const { date } = req;

    let parsedPlace;
    let parsedTime;
    try {
      parsedPlace = JSON.parse(markAttendanceDto.place);
      parsedTime = JSON.parse(markAttendanceDto.time);
    } catch (error) {
      parsedPlace = markAttendanceDto.place;
      parsedTime = markAttendanceDto.time;
    }

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
      date as string,
    );
    return res.status(200).json(updatedStudy);
  }

  @Patch(':date')
  async updateStudy(
    @Body() updateStudyDto: any,
    @Res() res: Response,
    @Req() req: Request,
    @Next() next: NextFunction,
  ) {
    const { date } = req;

    const updatedStudy = await this.realtimeService.updateStudy(
      updateStudyDto,
      date as string,
    );
    if (updatedStudy) {
      return res.status(200).json(updatedStudy);
    } else {
      return res.status(404).json({ message: 'Study not found' });
    }
  }

  @Patch(':date/time')
  async patchVote(
    @Body('start') start: string,
    @Body('end') end: string,
    @Res() res: Response,
    @Req() req: Request,
    @Next() next: NextFunction,
  ) {
    const { date } = req;
    console.log(15, date);
    await this.realtimeService.patchVote(start, end, date as string);
    return res.status(HttpStatus.OK).end();
  }

  //todo:route명 수정
  @Delete(':date/cancel')
  async deleteVote(
    @Res() res: Response,
    @Req() req: Request,
    @Next() next: NextFunction,
  ) {
    const { date } = req;
    console.log('date', date);
    await this.realtimeService.deleteVote(date as string);
    return res.status(HttpStatus.NO_CONTENT).end();
  }

  @Patch(':date/comment')
  async patchComment(
    @Body('comment') comment: string,
    @Res() res: Response,
    @Req() req: Request,
    @Next() next: NextFunction,
  ) {
    const { date } = req;

    await this.realtimeService.patchComment(comment, date as string);
    return res.status(HttpStatus.OK).end();
  }

  @Patch(':date/status')
  async patchStatus(
    @Body('status') status: string,
    @Res() res: Response,
    @Req() req: Request,
    @Next() next: NextFunction,
  ) {
    const { date } = req;

    const result = await this.realtimeService.patchStatus(
      status,
      date as string,
    );
    return res.status(HttpStatus.OK).json(result);
  }

  @Patch(':date/absence')
  async patchAbsence(
    @Body('absence') absence: boolean,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const { date } = req;

    const result = await this.realtimeService.patchAbsence(
      absence,
      date as string,
    );
    return res.status(HttpStatus.OK).json(result);
  }

  @Get(':date/test')
  async test(@Res() res: Response, @Next() next: NextFunction) {
    const result = await this.realtimeService.setResult();
    return res.status(HttpStatus.OK).json(result);
  }
}
