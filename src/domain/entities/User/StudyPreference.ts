// src/domain/entities/StudyPreference.ts

export interface StudyPreferenceProps {
  place?: string;
  subPlace?: string[];
}

export class StudyPreference {
  private place?: string;
  private subPlace: string[];

  constructor(props: StudyPreferenceProps) {
    this.place = props.place;
    this.subPlace = props.subPlace ?? [];
  }

  getPlace(): string | undefined {
    return this.place;
  }
  getSubPlace(): string[] {
    return this.subPlace;
  }

  toPrimitives(): StudyPreferenceProps {
    return {
      place: this.place,
      subPlace: [...this.subPlace],
    };
  }
}
