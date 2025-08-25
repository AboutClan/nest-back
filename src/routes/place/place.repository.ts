import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IPlace } from './place.entity';
import { PlaceRepository } from './place.repository.interface';

export class MongoPlaceReposotory implements PlaceRepository {
  constructor(
    @InjectModel(DB_SCHEMA.PLACE)
    private readonly Place: Model<IPlace>,
  ) {}

  async findByIds(placeIds: string[]): Promise<IPlace[]> {
    return await this.Place.find({ _id: { $in: placeIds } }).populate([
      {
        path: 'reviews.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      },
    ]);
  }

  async findAll(): Promise<IPlace[]> {
    return await this.Place.find({});
  }

  async findByStatus(status: string): Promise<IPlace[]> {
    const query =
      status === 'all'
        ? { $or: [{ status: 'main' }, { status: 'sub' }] }
        : { status };
    //임시로 status 제거
    return await this.Place.find(query).populate({
      path: 'registrant',
      select: ENTITY.USER.C_SIMPLE_USER,
    });
  }

  async findByLatLng(
    lowerLat: number,
    upperLat: number,
    lowerLng: number,
    upperLng: number,
  ) {
    return await this.Place.findOne({
      'location.latitude': { $gte: lowerLat, $lte: upperLat },
      'location.longitude': { $gte: lowerLng, $lte: upperLng },
    }).lean();
  }

  async createPlace(placeData: Partial<IPlace>): Promise<IPlace> {
    return await this.Place.create(placeData);
  }

  async updateLocation(placeId: string, location: any) {
    await this.Place.updateOne({ _id: placeId }, { $set: { location } });
    return null;
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

  async addReview(
    placeId: string,
    userId: string,
    review: string,
    rating: number,
    isSecret: boolean,
  ): Promise<null> {
    await this.Place.updateOne(
      { _id: placeId },
      {
        $push: {
          reviews: {
            user: userId,
            review,
            rating,
            isSecret,
          },
        },
      },
    );
    return null;
  }

  async test() {
    await this.Place.updateMany(
      {},
      {
        $set: { rating: null },
      },
    );
  }
}
