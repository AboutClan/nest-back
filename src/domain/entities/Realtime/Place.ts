// src/domain/entities/realtime/Place.ts

export interface PlaceProps {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

export class Place {
  private latitude: number;
  private longitude: number;
  private name: string;
  private address: string;

  constructor(props: PlaceProps) {
    if (props.latitude === undefined) {
      throw new Error('Place latitude is required');
    }
    if (props.longitude === undefined) {
      throw new Error('Place longitude is required');
    }
    if (!props.name) {
      throw new Error('Place name is required');
    }
    if (!props.address) {
      throw new Error('Place address is required');
    }

    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.name = props.name;
    this.address = props.address;
  }

  getLatitude(): number {
    return this.latitude;
  }
  getLongitude(): number {
    return this.longitude;
  }
  getName(): string {
    return this.name;
  }
  getAddress(): string {
    return this.address;
  }

  toPrimitives(): PlaceProps {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      name: this.name,
      address: this.address,
    };
  }
}
