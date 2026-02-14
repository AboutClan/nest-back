// src/domain/entities/gather/GatherList.ts
import { Time, TimeProps } from './Time';

export interface GatherListProps {
  text: string;
  time?: TimeProps;
}

export class GatherList {
  private text: string;
  private time: Time | null;

  constructor(props: GatherListProps) {
    this.text = props.text;
    this.time = props.time ? new Time(props.time) : null;
  }

  getText(): string {
    return this.text;
  }

  getTime(): Time | null {
    return this.time;
  }

  toPrimitives(): GatherListProps {
    return {
      text: this.text,
      time: this.time ? this.time.toPrimitives() : undefined,
    };
  }
}
