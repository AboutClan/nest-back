import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CreateVoteDTO } from './dto/createVoteDTO.dto';
import { UpdateVoteDTO } from './dto/updateVoteDTO.dto';
import { CreateQuickVoteDTO } from './dto/createQuickVoteDTO.dto';
import { Request } from 'express';
import { IVOTE_SERVICE } from 'src/utils/di.tokens';
import { IVoteService } from './voteService.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('vote')
@Controller('vote')
export class VoteController {
  constructor(@Inject(IVOTE_SERVICE) private voteService: IVoteService) {}

  @Get('arrived')
  async getArrivedPeriod(
    @Query('startDay') startDay: string,
    @Query('endDay') endDay: string,
  ): Promise<any> {
    const results = await this.voteService.getArrivedPeriod(startDay, endDay);
    return results;
  }

  @Get('participationCnt')
  async getParticipantsCnt(
    @Query('location') location: string,
    @Query('startDay') startDay: string,
    @Query('endDay') endDay: string,
  ): Promise<any> {
    const results = await this.voteService.getParticipantsCnt(
      location,
      startDay,
      endDay,
    );
    return results;
  }

  @Get('arriveCnt')
  async getArriveCheckCnt(): Promise<any> {
    const result = await this.voteService.getArriveCheckCnt();
    return result;
  }

  @Get(':date')
  async getFilteredVote(
    @Req() req: Request,
    @Query('location') location: string,
  ): Promise<any> {
    const { date } = req;

    const filteredVote = await this.voteService.getFilteredVote(date, location);
    return filteredVote;
  }

  @Post(':date')
  async setVote(
    @Req() req: Request,
    @Body() createVoteDTO: CreateVoteDTO,
  ): Promise<any> {
    const { place, subPlace, start, end, memo } = createVoteDTO;
    const { date } = req;

    await this.voteService.setVote(date, {
      place,
      subPlace,
      start,
      end,
      memo,
    });

    return 'success';
  }

  @Patch(':date')
  async patchVote(
    @Req() req: Request,
    @Body() updateVoteDTO: UpdateVoteDTO,
  ): Promise<any> {
    const { start, end } = updateVoteDTO;
    const { date } = req;

    await this.voteService.patchVote(date, start, end);
    return 'hello';
  }

  @Delete(':date')
  async deleteVote(@Req() req: Request): Promise<string> {
    const { date } = req;
    await this.voteService.deleteVote(date);
    return 'hello';
  }

  @Get(':date/week')
  async getFilteredVoteByDate(
    @Req() req: Request,
    @Query() location: string,
  ): Promise<any> {
    const { date } = req;

    const filteredVote = await this.voteService.getFilteredVoteByDate(
      date,
      location,
    );
    return filteredVote;
  }

  @Get(':date/one')
  async getFilteredVoteByDateOne(@Req() req: Request): Promise<any> {
    const { date } = req;

    const filteredVote = await this.voteService?.getFilteredVoteOne(date);

    return filteredVote;
  }

  @Post(':date/absence')
  async setAbsence(
    @Req() req: Request,
    @Body() body: { message: string },
  ): Promise<any> {
    const { message = '' } = body; // message 값, 기본값 설정
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService.setAbsence(date, message);
    return result;
  }

  @Get(':date/absence')
  async getAbsence(@Req() req: Request): Promise<any> {
    const { date } = req;

    const result = await this.voteService.getAbsence(date);
    return result;
  }

  @Get(':date/arrived')
  async getArrived(@Req() req: Request): Promise<any> {
    const { date } = req;

    const result = await this.voteService.getArrived(date);
    return result;
  }

  //todo: 이름변경
  @Patch(':date/arrived')
  async patchArrive(
    @Req() req: Request,
    @Body() body: { memo: string; endHour: any },
  ): Promise<any> {
    const { memo = '', endHour } = body; // message 값, 기본값 설정
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService.patchArrive(date, memo, endHour);
    return result;
  }

  @Patch(':date/confirm')
  async patchConfirm(@Req() req: Request): Promise<any> {
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기
    await this.voteService.patchConfirm(date);
    return 'success';
  }

  @Patch(':date/dismiss')
  async patchDismiss(@Req() req: Request): Promise<any> {
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기
    await this.voteService.patchDismiss(date);
    return 'success';
  }

  @Get(':date/start')
  async getStart(@Req() req: Request): Promise<any> {
    const { date } = req;
    const result = await this.voteService.getStart(date);
    return result;
  }

  @Patch(':date/quick')
  async quickVote(
    @Req() req: Request,
    @Body() CreateQuickVoteDTO: CreateQuickVoteDTO,
  ): Promise<any> {
    const { date } = req;

    await this.voteService.quickVote(date, CreateQuickVoteDTO);
    return 'success';
  }

  @Patch(':date/free')
  async setFree(
    @Req() req: Request,
    @Body() body: { placeId: string },
  ): Promise<any> {
    const { placeId } = body; // message 값, 기본값 설정
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    await this.voteService.setFree(date, placeId);
    return 'hello';
  }

  @Patch(':date/comment')
  async patchComment(
    @Req() req: Request,
    @Body() { comment }: { comment: string },
  ): Promise<any> {
    const { date } = req;

    await this.voteService.patchComment(date, comment);
    return 'success';
  }
}
