import { Inject } from '@nestjs/common';
import { PlaceProps } from 'src/domain/entities/Place';
import { ValidationError } from 'src/errors/ValidationError';
import { RequestContext } from 'src/request-context';
import { IPLACE_REPOSITORY } from 'src/utils/di.tokens';
import { OpenAIService } from 'src/utils/gpt/gpt.service';
import { z } from 'zod';
import { PlaceZodSchema } from '../../entity/place.entity';
import { PlaceRepository } from '../interfaces/place.repository.interface';

const GPT_STUDY_CAFE_RATING_SYSTEM_PROMPT = `
당신은 카페 리뷰를 분석해 카공(카페에서 공부하기)에 적합한지 평가하는 assistant입니다.

이 평가는 카페의 대표 이용층이나 인기 정도를 평가하는 것이 아닙니다.

이 평가는 "카공러 입장에서 이 카페가 카공하기 적합한가"를 평가하는 것입니다.

제공된 리뷰만을 근거로 판단하세요.

중요:

리뷰 개수나 비율을 평가하지 마세요.

카공 관련 리뷰가 존재하는지, 그리고 그 내용이 얼마나 강한 근거인지를 평가하세요.

예를 들어 리뷰가 500개 있고 그 중 2개만:

* 카공하기 좋다
* 공부하기 좋다
* 노트북 사용하기 좋다
* 작업하기 좋다

라고 작성되어 있다면, 이는 실제 카공 이용자의 직접 경험이므로 매우 중요한 근거입니다.

일반 이용자 리뷰가 많다는 이유만으로 카공 관련 리뷰를 희석하거나 감점하지 마세요.

정보 부족은 부정 근거가 아닙니다.

다음 정보는 카공 적합도 평가에 큰 영향을 주지 않습니다.

* 배달
* 포장
* 픽업
* 테이크아웃
* 커피 맛
* 디저트 맛
* 인테리어
* 사진 찍기 좋음
* 데이트 장소
* 방문객 수
* 리뷰 수

위 내용은 mood, table, space 평가 시 가급적 반영하지 마세요.

아래 항목을 판단하세요.

* is24Hours: 24시간 운영
* hasParking: 주차 가능
* hasGroupSeats: 단체석/그룹석 있음
* hasComfortableSeats: 좌석이 편함
* hasCleanRestroom: 화장실이 깨끗함
* hasGoodWifi: 와이파이/인터넷 좋음
* hasGoodValueDrinks: 음료 가성비 좋음 (저렴하거나 양이 많거나 리필 등)
* hasTimeLimit: 이용 시간 제한 있음

Boolean 판단 규칙:

* 리뷰에서 명확한 근거가 있을 때만 true
* 근거가 부족하거나 언급이 없으면 false

mood는 카공 적합도를 평가합니다.

mood:

* 5.0: "카공하기 좋다", "공부하기 좋다", "노트북 사용하기 좋다", "작업하기 좋다" 등의 직접적인 카공 추천 리뷰가 확인됨
* 4.5: 카공 관련 긍정 근거가 여러 종류 확인됨
* 4.0: 카공 관련 긍정 근거가 확인됨
* 3.5: 카공 관련 직접 근거는 부족하지만 조용함, 집중, 작업 가능 등의 간접 근거가 있음
* 3.0: 카공 관련 정보가 거의 없음
* 2.5: 시끄러움, 수다, 친목, 모임 중심이라는 부정 근거가 명확하게 확인됨

mood 판단 기준:

* 카공 관련 긍정 리뷰가 존재하면 적극적으로 높은 점수를 부여하세요.
* 카공 관련 리뷰의 존재 자체를 중요하게 평가하세요.
* 일반 이용자 리뷰가 많다는 이유로 감점하지 마세요.
* 단순히 조용하다는 이유만으로 5.0을 부여하지는 마세요.
* 명확한 부정 근거가 있을 때만 3.0 이하를 고려하세요.

table은 콘센트 사용 편의성을 평가합니다.

table:

* 5.0: "콘센트 많음", "콘센트 충분" 등의 리뷰가 확인됨
* 4.5: "콘센트 있음", "노트북 사용하기 좋음" 등의 리뷰가 확인됨
* 3.5: 콘센트 관련 긍정 근거가 약하게 확인됨
* 3.0: 콘센트 관련 정보가 없음
* 2.5: "콘센트 부족", "콘센트 찾기 어려움" 등의 리뷰가 확인됨
* 2.0: "콘센트 없음", "콘센트 사용 불가" 등의 리뷰가 확인됨

table 판단 기준:

* 콘센트 관련 긍정 리뷰가 존재하면 적극적으로 높은 점수를 부여하세요.
* 리뷰 수와 관계없이 실제 이용자의 직접 경험을 중요하게 반영하세요.
* 정보 부족은 3.0입니다.
* 명확한 부정 근거가 있을 때만 3.0 이하를 고려하세요.

space는 자리 여유를 평가합니다.

space:

* 5.0: "자리 넓음", "좌석 많음", "자리 여유 많음" 등의 리뷰가 확인됨
* 4.5: 자리 여유가 있다는 긍정 근거가 확인됨
* 4.0: 붐빌 수 있다는 언급이 있음
* 3.5: 자리 관련 정보가 없음
* 3.0: "자리 부족", "만석", "웨이팅" 등의 리뷰가 확인됨
* 2.5: 항상 자리 잡기 어렵다는 리뷰가 반복적으로 확인됨

space 판단 기준:

* 자리 여유 관련 긍정 리뷰가 존재하면 적극적으로 높은 점수를 부여하세요.
* 리뷰 수와 관계없이 실제 이용자의 직접 경험을 중요하게 반영하세요.
* 정보 부족은 3.0입니다.
* 명확한 부정 근거가 있을 때만 3.0 이하를 고려하세요.

etc:

* mood, table, space의 산술평균입니다.
* 별도로 평가하지 마세요.
* 반드시 (mood + table + space) / 3 으로 계산하세요.
* 소수점 첫째 자리까지만 사용하세요.

점수 규칙:

* mood, table, space, etc는 반드시 2.0 ~ 5.0 범위입니다.
* mood, table, space는 반드시 0.5 단위만 사용합니다.
* 정보 부족은 부정 평가가 아닙니다.
* 긍정 근거가 존재하면 적극적으로 반영하세요.
* 부정 점수는 명확한 부정 리뷰가 있을 때만 부여하세요.

반드시 아래 JSON 객체만 출력하세요.

{
"is24Hours": boolean,
"hasParking": boolean,
"hasGroupSeats": boolean,
"hasComfortableSeats": boolean,
"hasCleanRestroom": boolean,
"hasGoodWifi": boolean,
"hasGoodValueDrinks": boolean,
"hasTimeLimit": boolean,
"mood": number,
"table": number,
"space": number,
"etc": number
}



`.trim();

const gptRatingResultSchema = z.object({
  is24Hours: z.boolean(),
  hasParking: z.boolean(),
  hasGroupSeats: z.boolean(),
  hasComfortableSeats: z.boolean(),
  hasCleanRestroom: z.boolean(),
  hasGoodWifi: z.boolean(),
  hasGoodValueDrinks: z.boolean(),
  hasTimeLimit: z.boolean(),
  mood: z.number().min(2).max(5),
  table: z.number().min(2).max(5),
  space: z.number().min(2).max(5),
  etc: z.number().min(2).max(5),
});

export default class PlaceService {
  constructor(
    @Inject(IPLACE_REPOSITORY)
    private readonly placeRepository: PlaceRepository,
    private readonly openAIService: OpenAIService,
  ) {}
  async getPlaceByLatLng(lat: number, lng: number) {
    const multiplier = Math.pow(10, 5);

    const lowerLat = Math.trunc(lat * multiplier) / multiplier;
    const upperLat = lowerLat + 1 / multiplier;

    const lowerLng = Math.trunc(lng * multiplier) / multiplier;
    const upperLng = lowerLng + 1 / multiplier;

    const place = await this.placeRepository.findByLatLng(
      lowerLat,
      upperLat,
      lowerLng,
      upperLng,
    );

    if (!place) {
      return null;
    }

    const ratings = this.calculateRating(place?.ratings);
    // return { ...place, ratings: ratings || {} };
    return {
      ...place,
      // ratings: { mood: 5, table: 5, space: 5, etc: 5, userList: [] },
    };
  }

  async getActivePlace(status: 'main' | 'best' | 'good' | 'all') {
    try {
      console.log(1234);
      const places = await this.placeRepository.findByStatus(status);
      // const ratings = places.map((place) =>
      //   this.calculateRating(place?.ratings),
      // );
      console.log(25, places[0]);
      return places;
      // console.log(places[0]);
      // return places.map((place, index) => ({
      //   ...place,
      //   ratings: place?.ratings || [],
      //   // // ratings: ratings[index] || {},
      //   // ratings: { mood: 5, table: 5, space: 5, etc: 5, userList: [] },
      // }));
    } catch (err: any) {
      throw new Error(err);
    }
  }
  async getNearPlace(placeId: string) {
    try {
      const places = await this.placeRepository.findClosePlace(placeId);
      const ratings = places.map((place) =>
        this.calculateRating(place?.ratings),
      );
      return places.map((place, index) => ({
        ...place,
        // ratings: ratings[index] || {},
        // ratings: { mood: 5, table: 5, space: 5, etc: 5, userList: [] },
      }));
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async addRating(
    placeId: string,
    mood: number,
    table: number,
    space: number,
    etc: number,
    comment: string,
    name: string,
  ) {
    try {
      const token = RequestContext.getDecodedToken();
      const userId = token.id as string;

      const ratings = {
        user: userId,
        mood: mood,
        table: table,
        space: space,
        etc: etc,
        comment: comment,
        name: name,
      };

      await this.placeRepository.addRating(placeId, ratings);

      return;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async evaluatePlaceWithGpt(placeId: string, externalReviews: string[] = []) {
    const places = await this.placeRepository.findByIds([placeId]);
    const place = places[0];
    if (!place) throw new ValidationError('place not found');
    console.log('LOADING');
    const existingComments = (place.ratings || [])
      .map((r) => r.comment)
      .filter(Boolean);

    const allReviews = [...existingComments, ...externalReviews];

    const userPrompt =
      `카페명: ${place.name || '알 수 없음'}\n\n` +
      `리뷰 목록:\n${allReviews.length ? allReviews.map((r, i) => `${i + 1}. ${r}`).join('\n') : '리뷰 없음'}`;

    const raw = await this.openAIService.structured<object>(
      GPT_STUDY_CAFE_RATING_SYSTEM_PROMPT,
      userPrompt,
      {},
    );

    const result = gptRatingResultSchema.parse(raw);
    const { mood, table, space, etc, ...studyCafeMeta } = result;

    const computedRating =
      Math.round(((mood + table + space + etc) / 4) * 10) / 10;

    await this.placeRepository.updateStudyCafeMetaAndRating(
      placeId,
      studyCafeMeta,
      computedRating,
    );

    await this.placeRepository.addRating(placeId, {
      mood,
      table,
      space,
      etc,
      comment: 'AI 카공 적합도 분석',
      name: '어바웃 AI',
    });

    return { ...result, computedRating };
  }

  async getPlacesWithCursor(cursor: number) {
    const gap = 5;
    return await this.placeRepository.findWithCursor(cursor, gap);
  }

  async getAllRatingsSorted(cursor: number) {
    const gap = 10;
    return await this.placeRepository.findAllRatingsSorted(cursor, gap);
  }

  async getAllPlace() {
    const places = await this.placeRepository.findAll();
    const ratings = places.map((place) => this.calculateRating(place?.ratings));
    return places.map((place, index) => ({
      ...place,
      // ratings: ratings[index] || {},
      // ratings: { mood: 5, table: 5, space: 5, etc: 5, userList: [] },
    }));
  }

  async addPlace(
    placeData: PlaceProps,
    initialRating?: {
      mood: number;
      table: number;
      space: number;
      etc: number;
      comment?: string;
      name?: string;
    },
  ) {
    try {
      const token = RequestContext.getDecodedToken();
      const { location, status } = placeData;

      placeData.registerDate = new Date().toISOString();
      placeData.status = status || 'sub';
      placeData.registrant = token.id as string;

      if (!location) throw new ValidationError(`location not exist`);

      const validatedPlace = PlaceZodSchema.parse(placeData);

      const created = await this.placeRepository.createPlace(validatedPlace);
      const placeId = created._id.toString();

      if (initialRating) {
        await this.placeRepository.addRating(placeId, {
          ...initialRating,
          user: token.id,
        });
      }

      const externalReviews = initialRating?.comment
        ? [initialRating.comment]
        : [];
      this.evaluatePlaceWithGpt(placeId, externalReviews).catch((err) => {
        console.error('[evaluatePlaceWithGpt] 실패:', err?.message ?? err);
      });

      return;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async updateStatus(placeId: any, status: any) {
    const statusList = ['active', 'inactive'];

    if (!statusList.includes(status)) throw new ValidationError('wrong status');

    await this.placeRepository.updateStatus(placeId, status);

    return;
  }

  async updatePrefCnt(placeId: string, num: number) {
    await this.placeRepository.updatePrefCnt(placeId, num);
    return;
  }

  async updateLocation(placeId: string, location: any) {
    await this.placeRepository.updateLocation(placeId, location);
    return;
  }

  calculateRating(ratings: any) {
    const moodArray = ratings?.mood || [];
    const tableArray = ratings?.table || [];
    const beverageArray = ratings?.space || [];
    const etcArray = ratings?.etc || [];

    const mood =
      moodArray.length > 0
        ? moodArray.reduce((acc: number, curr: any) => acc + curr.rating, 0) /
          moodArray.length
        : 0;
    const table =
      tableArray.length > 0
        ? tableArray.reduce((acc: number, curr: any) => acc + curr.rating, 0) /
          tableArray.length
        : 0;
    const space =
      beverageArray.length > 0
        ? beverageArray.reduce(
            (acc: number, curr: any) => acc + curr.rating,
            0,
          ) / beverageArray.length
        : 0;
    const etc =
      etcArray.length > 0
        ? etcArray.reduce((acc: number, curr: any) => acc + curr.rating, 0) /
          etcArray.length
        : 0;

    const userList = Array.from(
      new Set([
        ...moodArray.map((user: any) => user?.user.toString()).filter(Boolean),
        ...tableArray.map((user: any) => user?.user.toString()).filter(Boolean),
        ...beverageArray
          .map((user: any) => user?.user.toString())
          .filter(Boolean),
        ...etcArray.map((user: any) => user?.user.toString()).filter(Boolean),
      ]),
    );

    return { mood, table, space, etc, userList };
  }

  async test() {
    const places = await this.placeRepository.test();
  }
}
