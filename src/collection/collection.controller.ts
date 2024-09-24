import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { CollectionService } from './collection.service';

@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

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

  @Patch('alphabet')
  async setCollection(@Body('alphabet') alphabet: string) {
    try {
      await this.collectionService.setCollection(alphabet);
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