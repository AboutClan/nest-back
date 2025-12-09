import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CollectionService } from './collection.service';
import { updateAlpabetDTO, updateCollectionDTO } from './dto';

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

  @Patch('alphabet')
  async setAlphabet(@Body() updateAlpabetDTO: updateAlpabetDTO) {
    const { alphabet } = updateAlpabetDTO;
    const alphabetCollection =
      await this.collectionService.setCollection(alphabet);
    return { alphabet: alphabetCollection };
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
