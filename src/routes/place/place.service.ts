import { Inject } from '@nestjs/common';
import { ValidationError } from 'src/errors/ValidationError';
import { RequestContext } from 'src/request-context';
import { IPLACE_REPOSITORY } from 'src/utils/di.tokens';
import { IPlace, PlaceZodSchema } from './place.entity';
import { PlaceRepository } from './place.repository.interface';

export default class PlaceService {
  constructor(
    @Inject(IPLACE_REPOSITORY)
    private readonly placeRepository: PlaceRepository,
  ) {}
  async getActivePlace(status: 'active' | 'inactive') {
    try {
      const places = await this.placeRepository.findByStatus(status);
      return places;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async addPlace(placeData: IPlace) {
    try {
      const token = RequestContext.getDecodedToken();
      const {
        fullname,
        brand,
        branch,
        image,
        latitude,
        longitude,
        coverImage,
        locationDetail,
        time,
        registerDate,

        mapURL,
      } = placeData;

      if (!time) placeData.time = 'unknown';
      if (!registerDate) placeData.registerDate = new Date().toString();
      placeData.status = 'active';
      placeData.registrant = token.id as string;

      if (
        !fullname ||
        !brand ||
        !branch ||
        !image ||
        !latitude ||
        !longitude ||
        !coverImage ||
        !locationDetail ||
        !mapURL
      )
        throw new ValidationError(
          `fullname ||brand ||branch ||image ||latitude ||longitude ||coverImage ||locationDetail ||mapURL not exist`,
        );

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
}
