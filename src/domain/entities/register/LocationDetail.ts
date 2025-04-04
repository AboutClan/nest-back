export interface LocationDetailProps {
  text: string;
  lat: number;
  lon: number;
}

export class LocationDetail {
  private text: string;
  private lat: number;
  private lon: number;

  constructor(props: LocationDetailProps) {
    if (!props.text) {
      throw new Error('text is required');
    }
    if (props.lat === undefined) {
      throw new Error('lat is required');
    }
    if (props.lon === undefined) {
      throw new Error('lon is required');
    }

    this.text = props.text;
    this.lat = props.lat;
    this.lon = props.lon;
  }

  getText(): string {
    return this.text;
  }
  getLat(): number {
    return this.lat;
  }
  getLon(): number {
    return this.lon;
  }

  toPrimitives(): LocationDetailProps {
    return {
      text: this.text,
      lat: this.lat,
      lon: this.lon,
    };
  }
}
