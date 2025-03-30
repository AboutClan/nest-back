import { InjectModel } from '@nestjs/mongoose';
import { ICollectionRepository } from './CollectionRepository.interface';
import { Model } from 'mongoose';
import { ICollection } from './collection.entity';

export class CollectionRepository implements ICollectionRepository {
  constructor(
    @InjectModel('Collection') private readonly Collection: Model<ICollection>,
  ) {}
}
