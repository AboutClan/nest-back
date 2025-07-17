export class LocationDetail {
  constructor(
    public text?: string,
    public lat?: number,
    public lon?: number,
  ) {
    this.text = text || '';
    this.lat = lat ? parseFloat(lat.toString()) : 0;
    this.lon = lon ? parseFloat(lon.toString()) : 0;
  }

  setLocationDetail(text, lat, lon) {
    this.text = text;
    this.lat = parseFloat(lat);
    this.lon = parseFloat(lon);
  }

  toPrimitives() {
    return { text: this.text, lat: this.lat, lon: this.lon };
  }
}

export interface ILocationDetail {
  text?: string;
  lat?: number;
  lon?: number;
}
