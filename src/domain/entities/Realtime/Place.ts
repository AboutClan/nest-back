// src/domain/entities/Place.ts

export interface PlaceProps {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  id?: string; // _id (optional)
}

export class Place {
  private latitude: number;
  private longitude: number;
  private name: string;
  private address: string;
  private id?: string; // Optional if we want to store the DB _id

  constructor(props: PlaceProps) {
    if (props.latitude === undefined) {
      throw new Error('latitude is required');
    }
    if (props.longitude === undefined) {
      throw new Error('longitude is required');
    }
    if (!props.name) {
      throw new Error('name is required');
    }
    if (!props.address) {
      throw new Error('address is required');
    }

    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.name = props.name;
    this.address = props.address;
    this.id = props.id;
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
  getId(): string | undefined {
    return this.id;
  }

  toPrimitives(): PlaceProps {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      name: this.name,
      address: this.address,
      id: this.id,
    };
  }
}
