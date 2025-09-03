// src/domain/entities/Place.ts

export type PlaceStatus = 'main' | 'sub' | 'inactive';

interface LocationProps {
  latitude: number;
  longitude: number;
  address: string;
  name: string;
}
export interface PlaceProps {
  status: PlaceStatus;
  location: LocationProps;
  registerDate: string;
  prefCnt: number;
  image?: string;
  coverImage?: string;
  registrant?: string;
}

/**
 * Place 도메인 엔티티
 */
export class Place {
  private status: PlaceStatus;
  private location: LocationProps;
  private registerDate: string;
  private prefCnt: number;
  private image?: string;
  private coverImage?: string;
  private registrant?: string;

  constructor(props: PlaceProps) {
    this.status = props.status ?? 'sub';
    this.location = props.location;
    this.registerDate = props.registerDate;
    this.prefCnt = props.prefCnt ?? 0;
    this.image = props.image;
    this.coverImage = props.coverImage;
    this.registrant = props.registrant;
  }

  // getters
  // getStatus(): PlaceStatus {
  //   return this.status;
  // }
  // getFullname(): string {
  //   return this.fullname;
  // }
  // getBrand(): string {
  //   return this.brand;
  // }
  // getBranch(): string | undefined {
  //   return this.branch;
  // }
  // getImage(): string | undefined {
  //   return this.image;
  // }
  // getCoverImage(): string | undefined {
  //   return this.coverImage;
  // }
  // getLatitude(): string {
  //   return this.latitude;
  // }
  // getLongitude(): string {
  //   return this.longitude;
  // }
  // getPriority(): number {
  //   return this.priority;
  // }
  // getLocation(): string {
  //   return this.location;
  // }
  // getLocationDetail(): string | undefined {
  //   return this.locationDetail;
  // }
  // getTime(): string | undefined {
  //   return this.time;
  // }
  // getRegisterDate(): string | undefined {
  //   return this.registerDate;
  // }
  // getRegistrant(): string | undefined {
  //   return this.registrant;
  // }
  // getMapURL(): string {
  //   return this.mapURL;
  // }
  // getPrefCnt(): number {
  //   return this.prefCnt;
  // }

  // 예시 비즈니스 로직
  increasePrefCnt(count: number = 1): number {
    this.prefCnt += count;
    return this.prefCnt;
  }

  deactivate() {
    this.status = 'inactive';
  }

  // 등등 추가 메서드 가능

  toPrimitives(): PlaceProps {
    return {
      status: this.status ?? 'sub',
      location: this.location,
      registerDate: this.registerDate,
      prefCnt: this.prefCnt ?? 0,
      image: this.image,
      coverImage: this.coverImage,
      registrant: this.registrant,
    };
  }
}
