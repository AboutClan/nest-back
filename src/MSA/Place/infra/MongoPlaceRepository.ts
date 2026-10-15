import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  async updateRating(placeId: string, rating: number): Promise<void> {
    await this.Place.updateOne({ _id: placeId }, { $set: { rating } });
  }

  async markCrawled(placeId: string): Promise<void> {
    await this.Place.updateOne(
      { _id: placeId },
      { $set: { lastCrawledAt: new Date() } },
    );
  }

  async updateAIRating(
    placeId: string,
    scores: { mood: number; power: number; space: number; etc: number },
    comment?: string,
  ): Promise<void> {
    await this.Place.updateOne(
      { _id: placeId, 'ratings.name': '어바웃 AI' },
      {
        $set: {
          'ratings.$.mood': scores.mood,
          'ratings.$.power': scores.power,
          'ratings.$.space': scores.space,
          'ratings.$.etc': scores.etc,
          // 요약이 없으면 기존 본문 유지
          ...(comment && { 'ratings.$.comment': comment }),
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
    extra?: {
      naverPlace?: { businessId: string; businessType: string };
      naverKeywords?: {
        totalCount: number;
        details: { name: string; count: number }[];
      };
      /** 네이버 상세 대표 이미지 주소 */
      image?: string;
    },
  ): Promise<void> {
    const update: Record<string, unknown> = {};
    // 크롤러가 영업시간을 못 찾은 경우([]) 기존 값 유지
    if (operatingHours.length > 0) {
      update.operatingHours = operatingHours;
    }
    if (studyCafeMeta !== undefined) {
      update.studyCafeMeta = studyCafeMeta;
    }
    if (extra?.naverPlace !== undefined) {
      update.naverPlace = extra.naverPlace;
    }
    if (extra?.naverKeywords !== undefined) {
      update.naverKeywords = extra.naverKeywords;
    }
    // 대표 이미지를 못 찾은 경우 기존 값 유지
    if (extra?.image) {
      update.image = extra.image;
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
    const items = await this.Place.aggregate([
      { $unwind: { path: '$ratings', includeArrayIndex: 'ratingIdx' } },
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
          pipeline: [{ $project: { profileImage: 1, role: 1 } }],
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
          ratingIdx: 1,
        },
      },
    ]);

    await this.attachReviewSeq(items);

    for (const item of items) {
      delete item.ratingIdx;
      if (item.rating?.userInfo) delete item.rating.userInfo.role;
    }
    return items;
  }

  /**
   * 작성자가 쓴 몇 번째 후기인지(rating.reviewSeq)를 붙인다.
   * 순서: createdAt(없으면 가장 오래된 것으로) → place _id → 배열 index.
   * 공용 게스트 계정·'어바웃 AI'·작성자 없는 후기는 제외한다.
   */
  private async attachReviewSeq(items: any[]): Promise<void> {
    const isCountable = (item: any) =>
      item.rating?.user &&
      item.rating?.userInfo?.role !== 'guest' &&
      item.rating?.name !== '어바웃 AI';
    const reviewerIds = [
      ...new Set(
        items.filter(isCountable).map((item) => String(item.rating.user)),
      ),
    ].map((id) => new Types.ObjectId(id));
    if (reviewerIds.length === 0) return;

    const history = await this.Place.aggregate([
      { $match: { 'ratings.user': { $in: reviewerIds } } },
      { $project: { ratings: 1 } },
      { $unwind: { path: '$ratings', includeArrayIndex: 'idx' } },
      {
        $match: {
          'ratings.user': { $in: reviewerIds },
          'ratings.name': { $ne: '어바웃 AI' },
        },
      },
      {
        $project: {
          user: '$ratings.user',
          createdAt: '$ratings.createdAt',
          idx: 1,
        },
      },
    ]);

    const toTime = (value: unknown) => {
      const time = value ? new Date(value as string).getTime() : 0;
      return Number.isNaN(time) ? 0 : time;
    };
    const byUser = new Map<string, any[]>();
    for (const h of history) {
      const key = String(h.user);
      const list = byUser.get(key) ?? [];
      list.push(h);
      byUser.set(key, list);
    }
    const seqByRating = new Map<string, number>();
    for (const list of byUser.values()) {
      list
        .sort(
          (a, b) =>
            toTime(a.createdAt) - toTime(b.createdAt) ||
            String(a._id).localeCompare(String(b._id)) ||
            a.idx - b.idx,
        )
        .forEach((h, i) => seqByRating.set(`${h._id}:${h.idx}`, i + 1));
    }

    for (const item of items) {
      if (!isCountable(item)) continue;
      const seq = seqByRating.get(`${item.placeInfo._id}:${item.ratingIdx}`);
      if (seq) item.rating.reviewSeq = seq;
    }
  }

  async findForVote2(): Promise<IPlace[]> {
    const places = await this.Place.find({
      status: 'main',
    }).lean();
    return places;
  }

  async findTopRanked(
    limit: number,
    excludeNameKeywords: string[] = [],
  ): Promise<{ place: IPlace; totalScore: number }[]> {
    const excludeNameMatch = excludeNameKeywords.length
      ? {
          'location.name': {
            $not: new RegExp(excludeNameKeywords.join('|')),
          },
        }
      : {};

    const results = await this.Place.aggregate([
      {
        $match: {
          $expr: { $gte: [{ $size: { $ifNull: ['$ratings', []] } }, 2] },
          // 정렬·limit 전에 제외해야 제외된 만큼 다음 순위로 채워진다
          ...excludeNameMatch,
        },
      },
      {
        $addFields: {
          totalScore: {
            $divide: [
              {
                $reduce: {
                  input: '$ratings',
                  initialValue: 0,
                  in: {
                    $add: [
                      '$$value',
                      {
                        $add: [
                          { $ifNull: ['$$this.mood', 0] },
                          { $ifNull: ['$$this.power', 0] },
                          { $ifNull: ['$$this.space', 0] },
                          { $ifNull: ['$$this.etc', 0] },
                        ],
                      },
                    ],
                  },
                },
              },
              { $multiply: [{ $size: '$ratings' }, 4] },
            ],
          },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: limit },
      { $project: { place: '$$ROOT', totalScore: 1 } },
    ]);

    return results.map((r) => ({ place: r.place, totalScore: r.totalScore }));
  }

  async findByUserId(userId: string) {
    const places = await this.Place.find({
      $or: [{ registrant: userId }, { 'ratings.user': userId }],
    }).lean();

    const registeredPlaces = places
      .filter((place) => place.registrant?.toString() === userId)
      .slice(0, userId === '65df1ddcd73ecfd250b42c89' ? 11 : undefined);

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

  async toggleLike(
    placeId: string,
    userId: string,
  ): Promise<{ liked: boolean }> {
    const objectId = new Types.ObjectId(userId);
    const place = await this.Place.findById(placeId).select('likes').lean();
    const alreadyLiked = (place?.likes ?? []).some(
      (id) => id.toString() === userId,
    );

    if (alreadyLiked) {
      await this.Place.updateOne(
        { _id: placeId },
        { $pull: { likes: objectId } },
      );
      return { liked: false };
    } else {
      await this.Place.updateOne(
        { _id: placeId },
        { $addToSet: { likes: objectId } },
      );
      return { liked: true };
    }
  }

  async findLikesAndPicks(
    userId: string,
    userName: string,
  ): Promise<{ likes: IPlace[]; picks: IPlace[] }> {
    const objectId = new Types.ObjectId(userId);
    const [likes, picks] = await Promise.all([
      this.Place.find({ likes: objectId }).lean(),
      this.Place.find({ pick: userName }).lean(),
    ]);
    return { likes, picks };
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
