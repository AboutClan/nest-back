import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RequestService } from '../services/requestService';

// DTOs for request validation
class CreateRequestDto {
  request: string;
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
