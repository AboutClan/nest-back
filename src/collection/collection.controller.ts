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
import { updateCollectionDTO } from './dto';
import { ApiTags } from '@nestjs/swagger';
import { CollectionService } from './collection.service';

@ApiTags('controller')
@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get('alphabet')
  async getCollection() {
    const user = await this.collectionService.getCollection();
    return user;
  }

  //todo: route명 수정
  @Patch('alphabet/change')
  async changeCollection(@Body() updateCollectionDTO: updateCollectionDTO) {
    const { mine, opponent, myId, toUid } = updateCollectionDTO;
    await this.collectionService.changeCollection(mine, opponent, myId, toUid);
    return { status: 'success' };
  }

  @Post('alphabet/completed')
  async setCollectionCompleted() {
    await this.collectionService.setCollectionCompleted();
    return { status: 'success' };
  }

  @Get('alphabet/all')
  async getCollectionAll() {
    const users = await this.collectionService.getCollectionAll();
    return users;
  }
}
