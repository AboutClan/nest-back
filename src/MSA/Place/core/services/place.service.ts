import { Inject } from '@nestjs/common';
import NaverMapCrawler from 'src/crawler/cafe';
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

제공된 리뷰와 GraphQL 데이터를 근거로만 판단하세요.

중요:

리뷰 개수나 비율을 고려하지 마세요.

카공 관련 리뷰가 존재하는지, 그리고 그 내용이 얼마나 강한 근거인지를 평가하세요.

예를 들어 리뷰가 5,000개 있고 그 중 1~2개만:

* 카공하기 좋다
* 공부하기 좋다
* 작업하기 좋다
* 노트북 사용하기 좋다
* 열공 추천

등으로 작성되어 있다면, 이는 실제 카공 이용자의 직접 경험이므로 매우 중요한 근거입니다.

일반 이용자 리뷰가 많다는 이유로 카공 관련 리뷰를 희석하거나 감점하지 마세요.

정보 부족은 부정 근거가 아닙니다.

GraphQL 데이터 해석 기준:

* visitorReviews.items.body는 실제 방문자 리뷰 본문입니다.
* visitorReviewStats.analysis.votedKeyword.details는 방문자가 직접 선택한 구조화된 리뷰 데이터입니다.
* votedKeyword는 실제 이용자가 선택한 리뷰 데이터이므로 매우 강한 근거로 간주하세요.
* votedKeyword의 count는 리뷰 개수 비교용이 아니라 근거 강도 참고용으로만 사용하세요.
* votedKeyword는 일반 리뷰 본문보다 신뢰도가 높은 근거로 간주할 수 있습니다.
* body 리뷰와 votedKeyword가 충돌할 경우 votedKeyword를 우선적으로 참고하세요.
* 특정 키워드가 매우 높은 count를 가진다면 실제 이용 경험이 반복적으로 확인된 강한 근거로 간주할 수 있습니다. 절대적인 count 수치만으로 점수를 결정하지 마세요. 다만 "집중하기 좋아요", "좌석이 편해요", "매장이 넓어요" 등이 높은 count로 반복 확인된다면 실제 이용 경험이 지속적으로 확인된 강한 근거로 활용할 수 있습니다.
* body 리뷰가 부족하더라도 votedKeyword에 강한 카공 근거가 있으면 적극 반영하세요.
* body 리뷰와 votedKeyword가 모두 존재하면 함께 판단하세요.
* aiBriefing이나 textSummaries는 보조 근거로만 사용하세요.

다음 정보는 mood, power, space 평가 시 가급적 반영하지 마세요.

* 배달
* 포장
* 픽업
* 테이크아웃
* 커피 맛
* 음료 맛
* 디저트 맛
* 사진 찍기 좋음
* 데이트 장소
* 방문객 수
* 리뷰 수
* 브랜드 인지도

리뷰에 긍정 근거와 부정 근거가 동시에 존재할 수 있습니다.

이 경우 리뷰 개수를 비교하지 말고 각 근거의 강도를 기준으로 가장 적절한 점수를 선택하세요.

판단 항목:

* is24Hours: 24시간 운영 또는 새벽 시간에도 이용 가능하다/이용했다는 근거가 있을 때 true
* hasParking: 주차 가능
* hasGroupSeats: 단체석, 대형 테이블, 단체모임 하기 좋아요, 룸이 잘 되어있어요, 그룹 스터디 가능 등의 근거가 확인되면 true. 단순히 매장이 넓거나 층이 여러 개라는 이유만으로 true를 부여하지 마세요.
* hasComfortableSeats: 좌석이 편함
* hasCleanRestroom: 화장실이 깨끗함
* hasGoodWifi: 와이파이가 좋음
* hasGoodValueDrinks: 가성비 좋음
* hasTimeLimit: 이용 시간 제한 존재

Boolean 규칙:

* 리뷰 또는 GraphQL 데이터에서 명확한 근거가 있을 때만 true
* 근거가 부족하면 false

mood는 카공 적합도를 의미합니다.

카공은 공부, 과제, 독서, 자격증, 작업, 노트북 사용 등 집중 목적의 장시간 이용을 의미합니다.

mood:

* 5.0: "카공하기 좋다", "공부하기 좋다", "작업하기 좋다", "노트북 사용하기 좋다", "열공 추천" 등의 직접적인 카공 추천 근거가 확인됨. 또는 "집중하기 좋아요"가 강하게 확인되고, 동시에 "오래 머무르기 좋아요"나 실제 공부/작업 관련 리뷰가 함께 확인됨
* 4.5: 실제 이용자가 공부, 과제, 독서, 작업 등의 목적으로 이용했다는 리뷰가 확인됨
* 4.0: 조용함, 집중하기 좋음, 오래 머무르기 좋음, 차분함 등의 강한 간접 근거가 확인됨
* 3.5: 카공 관련 직접 근거는 부족하지만 카공에 유리한 환경이 확인됨
* 3.0: 카공 관련 정보가 없음

mood 판단 기준:

* 카공 관련 긍정 근거가 존재하면 적극적으로 높은 점수를 부여하세요.
* 리뷰 개수는 고려하지 마세요.
* 정보 부족은 부정 근거가 아닙니다.
* "집중하기 좋아요"는 매우 강한 카공 근거입니다.
* "집중하기 좋아요"가 확인되면 최소 4.0 이상을 적극 고려하세요.
* "집중하기 좋아요" + "오래 머무르기 좋아요"가 함께 확인되면 4.5 이상을 적극 고려하세요.
* visitorReviewStats.analysis.votedKeyword에서 "집중하기 좋아요"가 확인되고,
  동시에 "오래 머무르기 좋아요" 또는 실제 공부·작업 관련 리뷰가 함께 확인되면
  직접적인 카공 리뷰가 없더라도 5.0을 고려할 수 있습니다.
* "대화하기 좋아요"는 단독으로 카공 긍정 근거가 아닙니다.
* 시끄러움, 수다 중심, 오래 머무르기 어려움 등의 명확한 부정 근거가 있을 때만 3.0 이하를 고려하세요.

power는 콘센트 사용 편의성을 의미합니다.

카공 관련 리뷰는 power의 간접 근거입니다.

다만 카공 관련 근거가 매우 약하거나
단 한 줄 수준이라면 3.5를 유지할 수 있습니다.

실제 이용자가 장시간 작업, 노트북 사용,
카공, 공부 등을 했다는 명확한 경험이 확인될 때
4.0을 적극 고려하세요.

power:

* 5.0: 자리마다 콘센트 있음, 콘센트 많음, 콘센트 충분함
* 4.5: 콘센트 있음, 충전하기 좋음, 충전 가능
* 4.0: 카공하기 좋다, 공부하기 좋다, 노트북 사용하기 좋다, 작업하기 좋다, 열공 추천
* 3.5: 콘센트 관련 정보 없음
* 3.0: 콘센트 부족, 콘센트 찾기 어려움, 충전 불편
* 2.5: 콘센트 거의 없음, 충전이 매우 불편함

power 판단 기준:

* 정보 부족은 3.5입니다.
* 카공하기 좋다, 공부하기 좋다, 노트북 사용하기 좋다, 작업하기 좋다, 열공 추천 등은 콘센트 사용 가능성을 시사하는 강한 간접 근거입니다.
* 단, 콘센트 관련 직접 근거가 없다면 4.5 이상은 부여하지 마세요.
* 콘센트 관련 직접 부정 근거가 확인되면 카공 관련 간접 긍정 근거보다 우선합니다.

space는 자리 여유를 의미합니다.

space:

* 5.0: 자리 넓음, 좌석 많음, 층이 여러 개, 항상 자리 있음, 자리 여유 많음
* 4.5: 자리 여유가 있다는 긍정 근거가 명확히 확인됨
* 4.0: 매장이 넓음, 좌석 수가 적지 않음
* 3.5: 자리 관련 정보 없음
* 3.0: 자리 부족, 만석, 웨이팅 등의 부정 근거가 확인되지만 공간 관련 긍정 근거도 함께 존재함
* 2.5: 항상 만석, 자리 잡기 어려움, 웨이팅 반복, 좌석 부족이 지속적으로 언급됨

space 판단 기준:

* 자리 여유 관련 긍정 리뷰가 존재하면 적극적으로 높은 점수를 부여하세요.
* 리뷰 개수는 고려하지 마세요.
* 정보 부족은 3.5입니다.
* "매장이 넓어요"는 강한 공간 근거입니다.
* "매장이 넓어요"가 확인되면 최소 4.0 이상을 적극 고려하세요.
* "층이 여러 개", "좌석 많음", "대형 매장", "자리 많음"은 4.5~5.0 근거가 될 수 있습니다.
* "좌석이 편해요"는 좌석 품질이지 공간 크기 근거는 아닙니다.
* 단순히 "만석", "웨이팅" 리뷰가 존재한다는 이유만으로 낮은 점수를 부여하지 마세요.
* 주말, 점심시간, 피크타임의 일시적인 만석은 공간 부족의 강한 근거가 아닙니다.
* "매장이 넓어요", "층이 여러 개", "좌석 많음", "자리 많음" 등의 긍정 근거가 존재한다면 우선적으로 반영하세요.
* 공간 관련 긍정 근거와 부정 근거가 동시에 존재할 경우, 공간 규모와 좌석 수를 더 중요하게 평가하세요.

etc:

* mood, power, space의 산술평균입니다.
* 별도로 평가하지 마세요.
* 반드시 (mood + power + space) / 3 으로 계산하세요.
* 소수점은 0.5 단위로 반올림하세요.

점수 규칙:

* mood, power, space, etc는 반드시 2.0 ~ 5.0 범위
* mood, power, space, etc는 반드시 0.5 단위
* 정보 부족은 부정 평가가 아님
* 긍정 근거는 적극 반영
* 부정 점수는 명확한 부정 리뷰가 있을 때만 부여

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
"power": number,
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
  power: z.number().min(2).max(5),
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
      const places = await this.placeRepository.findByStatus(status);
      // const ratings = places.map((place) =>
      //   this.calculateRating(place?.ratings),
      // );

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
    power: number,
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
        power: power,
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
    const { mood, power, space, etc, ...studyCafeMeta } = result;

    const computedRating =
      Math.round(((mood + power + space + etc) / 4) * 10) / 10;

    await this.placeRepository.updateStudyCafeMetaAndRating(
      placeId,
      studyCafeMeta,
      computedRating,
    );

    const hasExistingAIRating = (place.ratings || []).some(
      (r: any) => r.name === '어바웃 AI',
    );

    if (hasExistingAIRating) {
      await this.placeRepository.updateAIRating(placeId, {
        mood,
        power,
        space,
        etc,
      });
    } else {
      await this.placeRepository.addRating(placeId, {
        mood,
        power,
        space,
        etc,
        comment: 'AI 카공 적합도 분석',
        name: '어바웃 AI',
      });
    }

    return { ...result, computedRating };
  }

  /**
   * 모든 place에 대해:
   * 1. 네이버 크롤링으로 operatingHours + studyCafeMeta 업데이트
   * 2. AI 댓글(어바웃 AI)이 없는 place에 한해 GPT 평가 추가
   */
  async processAllPlacesStudyCafe(): Promise<void> {
    const SKIP_AFTER = new Date('2026-06-02T07:40:47.540+00:00');

    const isAlreadyUpdated = (place: any): boolean => {
      const aiRating = (place.ratings ?? []).find(
        (r: any) => r.name === '어바웃 AI',
      );
      if (!aiRating) return false;
      const updatedAt = aiRating.updatedAt ?? aiRating.createdAt;
      if (!updatedAt) return false;
      return new Date(updatedAt) > SKIP_AFTER;
    };

    const places = await this.placeRepository.findAll();
    const targetPlaces = places.filter((p) => !isAlreadyUpdated(p));

    console.log(
      `전체 ${places.length}개 중 ${targetPlaces.length}개 처리 (${places.length - targetPlaces.length}개 스킵)`,
    );

    const crawledIds = new Set<string>();

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Step 1·2: 크롤 직후 즉시 GPT 평가
    const crawler = new NaverMapCrawler();
    await crawler.crawlPlacesList(
      targetPlaces.map((p) => ({
        _id: (p._id as any).toString(),
        location: p.location,
      })),
      async (result) => {
        crawledIds.add(result.placeId);

        await this.placeRepository.updateOperatingHoursAndStudyCafeMeta(
          result.placeId,
          result.operatingHours,
          result.studyCafeMeta,
        );

        try {
          await this.evaluatePlaceWithGpt(result.placeId, result.visitorReviews);
          await sleep(1_500);
        } catch (err) {
          console.error(`[GPT 평가 실패] ${result.placeId}:`, err);
          await sleep(5_000);
        }
      },
    );

    // Step 3: 크롤 실패한 place도 GPT 평가
    const remainingPlaces = await this.placeRepository.findAll();
    for (const place of remainingPlaces) {
      const placeId = (place._id as any).toString();
      if (crawledIds.has(placeId)) continue;
      if (isAlreadyUpdated(place)) continue;

      try {
        await this.evaluatePlaceWithGpt(placeId, []);
        await sleep(1_500);
      } catch (err) {
        console.error(`[GPT 평가 실패] ${placeId}:`, err);
        await sleep(5_000);
      }
    }
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
      power: number;
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
    const powerArray = ratings?.power || [];
    const beverageArray = ratings?.space || [];
    const etcArray = ratings?.etc || [];

    const mood =
      moodArray.length > 0
        ? moodArray.reduce((acc: number, curr: any) => acc + curr.rating, 0) /
          moodArray.length
        : 0;
    const power =
      powerArray.length > 0
        ? powerArray.reduce((acc: number, curr: any) => acc + curr.rating, 0) /
          powerArray.length
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
        ...powerArray.map((user: any) => user?.user.toString()).filter(Boolean),
        ...beverageArray
          .map((user: any) => user?.user.toString())
          .filter(Boolean),
        ...etcArray.map((user: any) => user?.user.toString()).filter(Boolean),
      ]),
    );

    return { mood, power, space, etc, userList };
  }

  async migrateRatingTableToPower() {
    await this.placeRepository.migrateRatingTableToPower();
  }

  async test() {
    const places = await this.placeRepository.test();
  }
}
