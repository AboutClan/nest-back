import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { C_simpleUser } from 'src/Constants/constants';
import { IPlace } from './place.entity';
import { PlaceRepository } from './place.repository.interface';

export class MongoPlaceReposotory implements PlaceRepository {
  constructor(
    @InjectModel('Place')
    private readonly Place: Model<IPlace>,
  ) {}

  async findByIds(placeIds: string[]): Promise<IPlace[]> {
    return await this.Place.find({ _id: { $in: placeIds } });
  }

  async findByStatus(status: string): Promise<IPlace[]> {
    return await this.Place.find({ status }).populate({
      path: 'registrant',
      select: C_simpleUser,
    });
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
