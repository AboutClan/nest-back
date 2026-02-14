export interface PlaceProps {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  _id: string;
}

export class Place {
  public readonly latitude: number;
  public readonly longitude: number;
  public readonly name: string;
  public readonly address: string;
  public readonly _id: string;

  constructor(
    latitude: number,
    longitude: number,
    name: string,
    address: string,
    _id: string,
  ) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.name = name;
    this.address = address;
    this._id = _id;
  }

  toPrimitives(): PlaceProps {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      name: this.name,
      address: this.address,
      _id: this._id,
    };
  }
}
