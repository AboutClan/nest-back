export class LocationDetail {
  constructor(
    public name?: string,
    public address?: string,
    public latitude?: number,
    public longitude?: number,
  ) {
    this.name = name || '';
    this.address = address || '';
    this.latitude = latitude ? parseFloat(latitude.toString()) : 0;
    this.longitude = longitude ? parseFloat(longitude.toString()) : 0;
  }

  setLocationDetail(name, address, latitude, longitude) {
    this.name = name;
    this.address = address;
    this.latitude = parseFloat(latitude.toString());
    this.longitude = parseFloat(longitude.toString());
  }

  toPrimitives() {
    return {
      name: this.name,
      address: this.address,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}

export interface ILocationDetail {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}
