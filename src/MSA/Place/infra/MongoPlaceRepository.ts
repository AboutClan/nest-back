import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { PlaceRepository } from '../core/interfaces/place.repository.interface';
import { IPlace } from '../entity/place.entity';

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
      // .populate([
      //   {
      //     path: 'reviews.userId',
      //     select: ENTITY.USER.C_SIMPLE_USER,
      //   },
      // ])
      .lean();
  }

  async findAll(): Promise<IPlace[]> {
    return await this.Place.find({}).lean();
  }

  async addRating(placeId: string, ratings: any): Promise<null> {
    await this.Place.updateOne(
      { _id: placeId },
      {
        $push: {
          ratings: ratings,
        },
      },
    );
    return null;
  }

  async findByStatus(): Promise<IPlace[]> {
    const query = {
      status: { $ne: 'inactive' },
    };

    const defaultMeta = {
      is24Hours: false,
      hasParking: false,
      hasGroupSeats: false,
      hasComfortableSeats: false,
      hasCleanRestroom: false,
      hasGoodWifi: false,
      hasGoodValueDrinks: false,
      hasTimeLimit: false,
    };

    //임시로 status 제거
    const places = await this.Place.find(query).lean();

    return places.map((place) => ({
      ...place,
      studyCafeMeta: place.studyCafeMeta ?? defaultMeta,
    }));
  }
  async findClosePlace(placeId: string): Promise<IPlace[]> {
    const result = await this.Place.find({}).lean();
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
      // .populate([
      //   {
      //     path: 'reviews.user',
      //     select: ENTITY.USER.C_SIMPLE_USER,
      //   },
      // ])
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

  async updateStudyCafeMetaAndRating(
    placeId: string,
    studyCafeMeta: object,
    rating: number,
  ): Promise<void> {
    await this.Place.updateOne(
      { _id: placeId },
      { $set: { studyCafeMeta, rating } },
    );
  }

  async updateAIRating(
    placeId: string,
    scores: { mood: number; power: number; space: number; etc: number },
  ): Promise<void> {
    await this.Place.updateOne(
      { _id: placeId, 'ratings.name': '어바웃 AI' },
      {
        $set: {
          'ratings.$.mood': scores.mood,
          'ratings.$.power': scores.power,
          'ratings.$.space': scores.space,
          'ratings.$.etc': scores.etc,
        },
      },
    );
  }

  async migrateRatingTableToPower(): Promise<void> {
    await this.Place.collection.updateMany(
      { 'ratings.table': { $exists: true } },
      [
        {
          $set: {
            ratings: {
              $map: {
                input: { $ifNull: ['$ratings', []] },
                as: 'r',
                in: {
                  $arrayToObject: {
                    $map: {
                      input: { $objectToArray: '$$r' },
                      as: 'field',
                      in: {
                        k: {
                          $cond: {
                            if: { $eq: ['$$field.k', 'table'] },
                            then: 'power',
                            else: '$$field.k',
                          },
                        },
                        v: '$$field.v',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    );
  }

  async updateOperatingHoursAndStudyCafeMeta(
    placeId: string,
    operatingHours: string[][],
    studyCafeMeta?: object,
  ): Promise<void> {
    const update: Record<string, unknown> = { operatingHours };
    if (studyCafeMeta !== undefined) {
      update.studyCafeMeta = studyCafeMeta;
    }
    await this.Place.findByIdAndUpdate(placeId, { $set: update });
  }

  async findWithCursor(cursor: number, gap: number): Promise<IPlace[]> {
    const all = await this.Place.find({}).lean();
    all.sort((a, b) => {
      const dateA = new Date(a.registerDate || 0).getTime();
      const dateB = new Date(b.registerDate || 0).getTime();
      return dateB - dateA;
    });
    return all.slice(gap * cursor, gap * cursor + gap);
  }

  async findAllRatingsSorted(cursor: number, gap: number): Promise<any[]> {
    return await this.Place.aggregate([
      { $unwind: '$ratings' },
      {
        $sort: {
          'ratings.createdAt': -1,
        },
      },
      { $skip: gap * cursor },
      { $limit: gap },
      {
        $lookup: {
          from: 'users',
          localField: 'ratings.user',
          foreignField: '_id',
          as: 'ratings.userInfo',
          pipeline: [{ $project: { name: 1, profileImage: 1 } }],
        },
      },
      {
        $unwind: {
          path: '$ratings.userInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          placeInfo: {
            _id: '$_id',
            name: '$name',
            image: '$image',
            coverImage: '$coverImage',
            location: '$location',
            status: '$status',
            rating: '$rating',
            prefCnt: '$prefCnt',
            pick: '$pick',
            operatingHours: '$operatingHours',
            studyCafeMeta: '$studyCafeMeta',
          },
          rating: '$ratings',
        },
      },
    ]);
  }

  async findForVote2(): Promise<IPlace[]> {
    const places = await this.Place.find({
      status: 'main',
      'studyCafeMeta.hasGroupSeats': true,
    }).lean();

    return places.filter((place) => {
      const ratings: any[] = Array.isArray(place.ratings) ? place.ratings : [];
      const total = ratings.reduce(
        (acc, cur) =>
          acc +
          (cur.mood ?? 0) +
          (cur.table ?? cur.power ?? 0) +
          (cur.space ?? 0) +
          (cur.etc ?? 0),
        0,
      );
      const totalScore =
        ratings.length > 3 ? total / (ratings.length * 4) : (place.rating ?? 0);
      return totalScore >= 3.8;
    });
  }

  async findByUserId(userId: string) {
    const places = await this.Place.find({
      $or: [{ registrant: userId }, { 'ratings.user': userId }],
    }).lean();

    const registeredPlaces = places.filter(
      (place) => place.registrant?.toString() === userId,
    );

    const myRatings = places.flatMap((place) => {
      const matched = (place.ratings as any[]).filter(
        (r) => r.user?.toString() === userId,
      );
      return matched.map((rating) => ({
        place: {
          _id: place._id,
          name: place.name,
          image: place.image,
          location: place.location,
        },
        rating,
      }));
    });

    return { registeredPlaces, myRatings };
  }

  async test() {
    await this.Place.updateMany(
      { studyCafeMeta: { $exists: false } },
      {
        $set: {
          studyCafeMeta: {
            is24Hours: false,
            hasParking: false,
            hasGroupSeats: false,
            hasComfortableSeats: false,
            hasCleanRestroom: false,
            hasGoodWifi: false,
            hasGoodValueDrinks: false,
            hasTimeLimit: false,
          },
        },
      },
    );
  }
}
