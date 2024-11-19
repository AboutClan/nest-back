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
import { updateCollectionDTO } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('controller')
@Controller('collection')
export class CollectionController {
  constructor(
    @Inject(ICOLLECTION_SERVICE) private collectionService: ICollectionService,
  ) {}

  @Get('alphabet')
  async getCollection() {
    const user = await this.collectionService.getCollection();
    return user;
  }

  //todo: 이게 도대체 뭐냐
  @Patch('alphabet')
  async setCollection() {
    // const result = await this.collectionService?.setCollectionStamp();
    return { status: 'success' };
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
    const result = await this.collectionService.setCollectionCompleted();

    //todo: Error 타입 수정
    if (result === 'not completed') {
      throw new HttpException('Not completed', HttpStatus.BAD_REQUEST);
    }
    return { status: 'success' };
  }

  @Get('alphabet/all')
  async getCollectionAll() {
    const users = await this.collectionService.getCollectionAll();
    return users;
  }
}
