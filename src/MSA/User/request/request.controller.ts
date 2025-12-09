import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestCategory } from './request.entity';
import RequestService from './request.service';

// DTOs for request validation
class CreateRequestDto {
  request: {
    category: RequestCategory;
    title: string;
    content: string;
    rest: {
      type: '일반' | '특별';
      start: Date;
      end: Date;
    };
  };
}

@ApiTags('request')
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

  @Post('check')
  async checkRequest(@Body('id') requestId: string) {
    try {
      await this.requestService.checkRequest(requestId);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error creating request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
