import { Body, Controller, Get, Post } from '@nestjs/common';
import { GatherRequestService } from '../services/gatherRequest.service';

@Controller('gatherRequest')
export class GatherRequestController {
  constructor(private readonly gatherService: GatherRequestService) {}

  @Get()
  async getGatherRequest() {
    return await this.gatherService.getGatherRequest();
  }

  @Post()
  async createGatherRequest(@Body() gatherRequestData: any) {
    return await this.gatherService.createGatherRequest(gatherRequestData);
  }

  @Post('like')
  async likeGatherRequest(@Body('grId') grId: string) {
    return await this.gatherService.likeGatherRequest(grId);
  }
}
