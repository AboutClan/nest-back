import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import RequestService from './request.service';
import { RequestCategory, RequestLocation } from './entity/request.entity';

// DTOs for request validation
class CreateRequestDto {
  request: {
    category: RequestCategory;
    title: string;
    writer: string;
    content: string;
    rest: {
      type: '일반' | '특별';
      start: Date;
      end: Date;
    };
    location: RequestLocation;
  };
}

@Controller('request')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Get()
  async getRequestData() {
    try {
      const requestData = await this.requestService.getRequest();
      return requestData;
    } catch (err) {
      throw new HttpException(
        'Error fetching request data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createRequest(@Body() createRequestDto: CreateRequestDto) {
    try {
      await this.requestService.createRequest(createRequestDto.request);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error creating request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
