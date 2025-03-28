import { JWT } from 'next-auth/jwt';
import { IPlace, PlaceZodSchema } from './place.entity';
import { ValidationError } from 'src/errors/ValidationError';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { IPLACE_REPOSITORY } from 'src/utils/di.tokens';
import { PlaceRepository } from './place.repository.interface';
import { RequestContext } from 'src/request-context';

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
        status,
        fullname,
        brand,
        branch,
        image,
        latitude,
        longitude,
        location,
        coverImage,
        locationDetail,
        time,
        registerDate,
        registrant,
        mapURL,
      } = placeData;

      if (!time) placeData.time = 'unknown';
      if (!registerDate) placeData.registerDate = new Date().toString();
      placeData.status = 'inactive';
      placeData.registrant = token.id as string;

      if (
        !fullname ||
        !brand ||
        !branch ||
        !image ||
        !latitude ||
        !longitude ||
        !location ||
        !coverImage ||
        !locationDetail ||
        !mapURL
      )
        throw new ValidationError(
          `fullname ||brand ||branch ||image ||latitude ||longitude ||location ||coverImage ||locationDetail ||mapURL not exist`,
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
    await this.updatePrefCnt(placeId, num);
    return;
  }
}
