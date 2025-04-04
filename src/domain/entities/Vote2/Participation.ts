// src/domain/entities/Participation.ts

export interface ParticipationProps {
  userId: string;
  latitude: string;
  longitude: string;
  start?: string;
  end?: string;
}

export class Participation {
  private userId: string;
  private latitude: string;
  private longitude: string;
  private start?: string;
  private end?: string;

  constructor(props: ParticipationProps) {
    if (!props.userId) {
      throw new Error('userId is required');
    }
    this.userId = props.userId;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.start = props.start;
    this.end = props.end;
  }

  getUserId(): string {
    return this.userId;
  }
  getLatitude(): string {
    return this.latitude;
  }
  getLongitude(): string {
    return this.longitude;
  }
  getStart(): string | undefined {
    return this.start;
  }
  getEnd(): string | undefined {
    return this.end;
  }

  toPrimitives(): ParticipationProps {
    return {
      userId: this.userId,
      latitude: this.latitude,
      longitude: this.longitude,
      start: this.start,
      end: this.end,
    };
  }
}
