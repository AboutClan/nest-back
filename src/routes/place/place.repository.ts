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
    return await this.Place.find({ _id: { $in: placeIds } })
      .populate({
        path: 'registrant',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate([
        {
          path: 'reviews.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);
  }

  async findAll(): Promise<IPlace[]> {
    return await this.Place.find({});
  }

  async findByStatus(
    status: 'main' | 'best' | 'good' | 'all',
  ): Promise<IPlace[]> {
    let query: any = {};
    if (status === 'all') {
      query = { $or: [{ status: 'main' }, { status: 'sub' }] };
    } else if (status === 'best') {
      query = { rating: { $gte: 4.5 } };
    } else if (status === 'good') {
      query = { rating: { $gte: 4.0 } };
    } else if (status === 'main') {
      query = { status: 'main' };
    }

    //임시로 status 제거
    return await this.Place.find(query)
      .populate({
        path: 'registrant',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate([
        {
          path: 'reviews.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);
  }
  async findClosePlace(placeId: string): Promise<IPlace[]> {
    const result = await this.Place.find({});
    const pickPlace = result.find((place) => place._id.toString() === placeId);

   

    const filterByLatLonKm = (
      places: IPlace[],
      center: IPlace,
      maxDistanceKm: number,
    ) => {
      if (!places?.length || !center) return [];

      const toNum = (v: number | string) =>
        typeof v === 'number' ? v : parseFloat(v);
      const { latitude: cLat, longitude: cLon } = center.location;

      const R = 6371; // 지구 반지름 (단위: km)
      const toRad = Math.PI / 180; // 각도를 라디안으로 변환하는 상수

      return places.filter((p) => {
        const lat = toNum(p.location.latitude);
        const lon = toNum(p.location.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

        // 위도/경도 차이를 라디안으로 계산
        const dLat = (lat - cLat) * toRad;
        const dLon = (lon - cLon) * toRad;

        const radLat1 = cLat * toRad;
        const radLat2 = lat * toRad;

        // 해버사인 공식으로 거리(km) 계산
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // maxDistanceKm 이내만 필터링
        return distance <= maxDistanceKm;
      });
    };

    const resultArr = filterByLatLonKm(result, pickPlace, 1);
   
    return resultArr;
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
    })
      .populate([
        {
          path: 'reviews.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ])
      .lean();
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
    console.log(32);
    // await this.Place.updateMany(
    //   { $or: [{ status: 'inactive' }, { status: { $exists: false } }] },
    //   { $set: { status: 'sub' } },
    // );
    // await this.Place.updateMany(
    //   {},
    //   {
    //     $set: { rating: null },
    //   },
    // );
  }
}
