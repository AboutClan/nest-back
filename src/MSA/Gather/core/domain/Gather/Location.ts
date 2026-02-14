export interface LocationProps {
  main: string;
  sub?: string;
  latitude: number;
  longitude: number;
}

export class Location {
  private main: string;
  private sub: string;
  private latitude: number;
  private longitude: number;

  constructor(props: LocationProps) {
    this.main = props.main;
    this.sub = props.sub ?? '';
    this.latitude = props.latitude ?? null;
    this.longitude = props.longitude ?? null;
  }

  getMain(): string {
    return this.main;
  }

  getSub(): string {
    return this.sub;
  }

  toPrimitives(): LocationProps {
    return {
      main: this.main,
      sub: this.sub,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}
