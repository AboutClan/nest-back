import { Inject } from '@nestjs/common';
import { PlaceProps } from 'src/domain/entities/Place';
import { ValidationError } from 'src/errors/ValidationError';
import { RequestContext } from 'src/request-context';
import { IPLACE_REPOSITORY } from 'src/utils/di.tokens';
import { PlaceZodSchema } from './place.entity';
import { PlaceRepository } from './place.repository.interface';

export default class PlaceService {
  constructor(
    @Inject(IPLACE_REPOSITORY)
    private readonly placeRepository: PlaceRepository,
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

    return place;
  }
  async getActivePlace(status: 'main' | 'all' | 'sub' | 'inactive') {
    try {
      const places = await this.placeRepository.findByStatus(status);
      return places;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async getAllPlace() {
    const places = await this.placeRepository.findAll();
    return places;
  }

  async addPlace(placeData: PlaceProps) {
    try {
      const token = RequestContext.getDecodedToken();
      const { location, status } = placeData;

      placeData.registerDate = new Date().toString();
      placeData.status = status || 'sub';
      placeData.registrant = token.id as string;
      console.log(25, placeData);
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

  async addReview(
    placeId: string,
    review: string,
    rating: number,
    isSecret: boolean,
  ) {
    try {
      const token = RequestContext.getDecodedToken();
      const userId = token.id as string;

      await this.placeRepository.addReview(
        placeId,
        userId,
        review,
        rating,
        isSecret,
      );
      return;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async test() {
    const places = await this.placeRepository.test();
  }
}
