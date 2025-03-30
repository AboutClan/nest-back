// src/domain/entities/Place.ts

export type PlaceStatus = 'active' | 'inactive' | 'pending';

export interface PlaceProps {
  status?: PlaceStatus;
  fullname: string;
  brand?: string;
  branch?: string;
  image?: string;
  coverImage?: string;
  latitude: string;
  longitude: string;
  priority?: number;
  location: string; // e.g. enum(LOCATION_LIST)
  locationDetail?: string;
  time?: string;
  registerDate?: string;
  registrantId?: string; // DB 에선 ref User => domain에서는 string
  mapURL: string;
  prefCnt?: number;
}

/**
 * Place 도메인 엔티티
 */
export class Place {
  private status: PlaceStatus;
  private fullname: string;
  private brand: string;
  private branch?: string;
  private image?: string;
  private coverImage?: string;
  private latitude: string;
  private longitude: string;
  private priority: number;
  private location: string;
  private locationDetail?: string;
  private time?: string;
  private registerDate?: string;
  private registrantId?: string;
  private mapURL: string;
  private prefCnt: number;

  constructor(props: PlaceProps) {
    // 필수값 검증
    if (!props.fullname) {
      throw new Error('Place fullname is required');
    }
    if (!props.latitude) {
      throw new Error('Place latitude is required');
    }
    if (!props.longitude) {
      throw new Error('Place longitude is required');
    }
    if (!props.location) {
      throw new Error('Place location is required');
    }
    if (!props.mapURL) {
      throw new Error('Place mapURL is required');
    }

    this.status = props.status ?? 'active';
    this.fullname = props.fullname;
    this.brand = props.brand ?? '';
    this.branch = props.branch;
    this.image = props.image;
    this.coverImage = props.coverImage;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.priority = props.priority ?? 0;
    this.location = props.location;
    this.locationDetail = props.locationDetail;
    this.time = props.time;
    this.registerDate = props.registerDate;
    this.registrantId = props.registrantId;
    this.mapURL = props.mapURL;
    this.prefCnt = props.prefCnt ?? 0;
  }

  // getters
  getStatus(): PlaceStatus {
    return this.status;
  }
  getFullname(): string {
    return this.fullname;
  }
  getBrand(): string {
    return this.brand;
  }
  getBranch(): string | undefined {
    return this.branch;
  }
  getImage(): string | undefined {
    return this.image;
  }
  getCoverImage(): string | undefined {
    return this.coverImage;
  }
  getLatitude(): string {
    return this.latitude;
  }
  getLongitude(): string {
    return this.longitude;
  }
  getPriority(): number {
    return this.priority;
  }
  getLocation(): string {
    return this.location;
  }
  getLocationDetail(): string | undefined {
    return this.locationDetail;
  }
  getTime(): string | undefined {
    return this.time;
  }
  getRegisterDate(): string | undefined {
    return this.registerDate;
  }
  getRegistrantId(): string | undefined {
    return this.registrantId;
  }
  getMapURL(): string {
    return this.mapURL;
  }
  getPrefCnt(): number {
    return this.prefCnt;
  }

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
      status: this.status,
      fullname: this.fullname,
      brand: this.brand,
      branch: this.branch,
      image: this.image,
      coverImage: this.coverImage,
      latitude: this.latitude,
      longitude: this.longitude,
      priority: this.priority,
      location: this.location,
      locationDetail: this.locationDetail,
      time: this.time,
      registerDate: this.registerDate,
      registrantId: this.registrantId,
      mapURL: this.mapURL,
      prefCnt: this.prefCnt,
    };
  }
}
