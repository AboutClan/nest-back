import { IPlace } from '../../entity/place.entity';

export interface PlaceRepository {
  findByStatus(status: string): Promise<IPlace[]>;
  findClosePlace(placeId: string): Promise<IPlace[]>;
  findAll(): Promise<IPlace[]>;
  createPlace(placeData: Partial<IPlace>): Promise<IPlace>;
  updateStatus(placeId: string, status: string): Promise<null>;
  updatePrefCnt(placeId: string, num: number);
  updateLocation(placeId: string, location: any);
  findByIds(placeIds: string[]): Promise<IPlace[]>;
  addRating(placeId: string, ratings: any): Promise<null>;
  findByLatLng(
    lowerLat: number,
    upperLat: number,
    lowerLng: number,
    upperLng: number,
  );
  findAllRatingsSorted(cursor: number, gap: number): Promise<any[]>;
  findWithCursor(cursor: number, gap: number): Promise<IPlace[]>;
  updateStudyCafeMetaAndRating(placeId: string, studyCafeMeta: object, rating: number): Promise<void>;
  updateOperatingHoursAndStudyCafeMeta(
    placeId: string,
    operatingHours: string[][],
    studyCafeMeta?: object,
  ): Promise<void>;
  updateAIRating(
    placeId: string,
    scores: { mood: number; power: number; space: number; etc: number },
  ): Promise<void>;
  migrateRatingTableToPower(): Promise<void>;
  test();
}
