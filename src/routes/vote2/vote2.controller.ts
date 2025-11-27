import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import {
  CreateArriveDTO,
  CreateNewVoteDTO,
  CreateNewVotesDTO,
  CreateParticipateDTO,
} from './vote2.dto';
import { Vote2Service } from './vote2.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('vote2')
export class Vote2Controller {
  constructor(private readonly voteService2: Vote2Service) {}

  @Get('week')
  async getWeekData(@Req() req: Request): Promise<any> {
    const filteredVote = await this.voteService2.getWeekData();
    return filteredVote;
  }
  @Get('mine')
  async getMine(@Req() req: Request): Promise<any> {
    const filteredVote = await this.voteService2.getMine();
    return filteredVote;
  }

  @Get(':date/info')
  async getVoteInfo(@Req() req: Request): Promise<any> {
    const { date } = req;
    const filteredVote = await this.voteService2.getVoteInfo(date as string);
    return filteredVote;
  }

  @Get(':date/one')
  async getFilteredVoteByDateOne(@Req() req: Request): Promise<any> {
    const { date } = req;

    const filteredVote = await this.voteService2.getFilteredVoteOne(
      date as string,
    );

    return filteredVote;
  }

  @Get('arrived')
  async getArrived(
    @Query('startDay') startDay: string,
    @Query('endDay') endDay: string,
  ) {
    const results = await this.voteService2.getArrivedPeriod(startDay, endDay);
    return results;
  }

  @Delete(':date')
  async deleteVote(@Req() req: Request): Promise<any> {
    const { date } = req;

    await this.voteService2.deleteVote(date as string);

    return 'success';
  }

  @Post(':date')
  async setVote(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVoteDTO,
  ): Promise<any> {
    const {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
      eps = 3,
    } = createVoteDTO;
    const { date } = req;

    await this.voteService2.setVote(date as string, {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
      userId: null,
      eps,
    });

    return null;
  }

  @Post(':date/invite')
  async setVoteInvite(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVoteDTO,
  ): Promise<any> {
    const {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
      userId,
      eps = 3,
    } = createVoteDTO;
    const { date } = req;

    await this.voteService2.setVote(date as string, {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
      userId,
      eps,
    });

    return null;
  }

  //스터디 매칭 투표
  @Post(':date/dateArr')
  async setVoteArr(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVotesDTO,
  ): Promise<any> {
    const {
      latitude,
      longitude,
      start,
      end,
      dates,
      locationDetail,
      eps = 3,
    } = createVoteDTO;

    await this.voteService2.setVoteWithArr(dates, {
      userId: null,
      latitude,
      longitude,
      start,
      end,
      locationDetail,
      eps,
    });

    return null;
  }

  @Patch(':date')
  async patchVote(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVoteDTO,
  ): Promise<any> {
    const {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
      eps = 3,
    } = createVoteDTO;
    const { date } = req;

    await this.voteService2.setVote(date as string, {
      userId: null,
      latitude,
      longitude,
      start,
      end,
      locationDetail,
      eps,
    });

    return 'success';
  }

  @Post(':date/comment')
  async setComment(
    @Req() req: Request,
    @Body('comment') comment: string,
  ): Promise<any> {
    const { date } = req;

    await this.voteService2.setComment(date as string, comment);

    return 'success';
  }

  //결과 발표난 스터디 id를 기준으로 즉시 참여
  @Post(':date/participate')
  async setAttend(
    @Req() req: Request,
    @Body() createParticipateDTO: CreateParticipateDTO,
  ): Promise<any> {
    const { start, end, placeId, eps = 1.0 } = createParticipateDTO;
    const { date } = req;

    await this.voteService2.setParticipate(date as string, {
      start,
      end,
      placeId,
      eps,
    });

    return 'success';
  }

  @Post(':date/result')
  async setResult(@Req() req: Request): Promise<any> {
    const { date } = req;
    await this.voteService2.setResult(date as string);

    return 'success';
  }

  @Patch(':date/result')
  async updateResult(
    @Req() req: Request,
    @Body('start') start: string,
    @Body('end') end: string,
  ): Promise<any> {
    const { date } = req;
    await this.voteService2.updateResult(date as string, start, end);

    return 'success';
  }

  @Post(':date/arrive')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async setArrive(
    @Req() req: Request,
    @Body() body: CreateArriveDTO,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    const { date } = req;
    const { memo, end } = body;
    const result = await this.voteService2.setArrive(
      date as string,
      memo,
      end,
      file?.buffer,
    );

    return result;
  }

  @Get(':date/absence')
  async segetAbsence(@Req() req: Request): Promise<any> {
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService2.getAbsence(date as string);
    return result;
  }

  @Post(':date/absence')
  async setAbsence(
    @Req() req: Request,
    @Body() body: { message: string; fee: number },
  ): Promise<any> {
    const { message = '', fee } = body; // message 값, 기본값 설정
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService2.setAbsence(
      date as string,
      message,
      fee,
    );
    return result;
  }

  @Patch(':date/memo')
  async updateMemo(
    @Req() req: Request,
    @Body() body: { memo: string },
  ): Promise<any> {
    const { date } = req;
    const { memo } = body;
    const result = await this.voteService2.updateMemo(date as string, memo);
    return result;
  }
}
