import { InjectModel } from '@nestjs/mongoose';
import { IPlace } from './place.entity';
import { PlaceRepository } from './place.repository.interface';
import { Model } from 'mongoose';

export class MongoPlaceReposotory implements PlaceRepository {
  constructor(
    @InjectModel('Place')
    private readonly Place: Model<IPlace>,
  ) {}

  async findByIds(placeIds: string[]): Promise<IPlace[]> {
    return await this.Place.find({ _id: { $in: placeIds } });
  }

  async findByStatus(status: string): Promise<IPlace[]> {
    return await this.Place.find({ status });
  }
  async createPlace(placeData: Partial<IPlace>): Promise<IPlace> {
    return await this.Place.create(placeData);
  }
  async updateStatus(placeId: string, status: string): Promise<null> {
    await this.Place.updateOne({ _id: placeId }, { status });
    return null;
  }
  async updatePrefCnt(placeId: string, num: number) {
    await this.Place.updateOne(
      { _id: placeId },
      {
        $inc: { prefCnt: num },
      },
    );

    return null;
  }
}
