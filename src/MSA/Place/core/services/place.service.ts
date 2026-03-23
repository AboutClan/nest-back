import { Inject } from '@nestjs/common';
import { PlaceProps } from 'src/domain/entities/Place';
import { ValidationError } from 'src/errors/ValidationError';
import { RequestContext } from 'src/request-context';
import { IPLACE_REPOSITORY } from 'src/utils/di.tokens';
import { PlaceZodSchema } from '../../entity/place.entity';
import { PlaceRepository } from '../interfaces/place.repository.interface';

export default class PlaceService {
  constructor(
    @Inject(IPLACE_REPOSITORY)
    private readonly placeRepository: PlaceRepository,
  ) { }
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
    return { ...place, ratings: { mood: 5, table: 5, space: 5, etc: 5, userList: [] } };
  }

  async getActivePlace(status: 'main' | 'best' | 'good' | 'all') {
    try {
      const places = await this.placeRepository.findByStatus(status);
      const ratings = places.map((place) =>
        this.calculateRating(place?.ratings),
      );
      return places.map((place, index) => ({
        ...place,
        // ratings: ratings[index] || {},
        ratings: { mood: 5, table: 5, space: 5, etc: 5, userList: [] },
      }));
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
        ratings: { mood: 5, table: 5, space: 5, etc: 5, userList: [] },
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
      };

      await this.placeRepository.addRating(placeId, ratings);

      return;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async getAllPlace() {
    const places = await this.placeRepository.findAll();
    const ratings = places.map((place) => this.calculateRating(place?.ratings));
    return places.map((place, index) => ({
      ...place,
      // ratings: ratings[index] || {},
      ratings: { mood: 5, table: 5, space: 5, etc: 5, userList: [] },
    }));
  }

  async addPlace(placeData: PlaceProps) {
    try {
      const token = RequestContext.getDecodedToken();
      const { location, status } = placeData;

      placeData.registerDate = new Date().toString();
      placeData.status = status || 'sub';
      placeData.registrant = token.id as string;

      if (!location) throw new ValidationError(`location not exist`);

      const validatedPlace = PlaceZodSchema.parse(placeData);

      await this.placeRepository.createPlace(validatedPlace);
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
