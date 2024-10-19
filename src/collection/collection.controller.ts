import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ICOLLECTION_SERVICE } from 'src/utils/di.tokens';
import { ICollectionService } from './collectionService.interface';

@Controller('collection')
export class CollectionController {
  constructor(
    @Inject(ICOLLECTION_SERVICE) private collectionService: ICollectionService,
  ) {}

  @Get('alphabet')
  async getCollection() {
    try {
      const user = await this.collectionService.getCollection();
      return user;
    } catch (err) {
      throw new HttpException(
        'Error fetching collection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //todo: 이게 도대체 뭐냐
  @Patch('alphabet')
  async setCollection() {
    try {
      // const result = await this.collectionService?.setCollectionStamp();
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error setting collection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('alphabet/change')
  async changeCollection(
    @Body('mine') mine: string,
    @Body('opponent') opponent: string,
    @Body('myId') myId: string,
    @Body('toUid') toUid: string,
  ) {
    try {
      const result = await this.collectionService.changeCollection(
        mine,
        opponent,
        myId,
        toUid,
      );
      if (result) {
        throw new HttpException(result, HttpStatus.BAD_REQUEST);
      }
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error changing collection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('alphabet/completed')
  async setCollectionCompleted() {
    try {
      const result = await this.collectionService.setCollectionCompleted();

      //todo: Error 타입 수정
      if (result === 'not completed') {
        throw new HttpException('Not completed', HttpStatus.BAD_REQUEST);
      }
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error setting collection as completed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alphabet/all')
  async getCollectionAll() {
    try {
      const users = await this.collectionService.getCollectionAll();
      return users;
    } catch (err) {
      throw new HttpException(
        'Error fetching all collections',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
