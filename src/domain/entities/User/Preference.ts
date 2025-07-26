export class Preference {
  constructor(
    public place?: string,
    public subPlace?: string[],
  ) {
    this.place = place || '';
    this.subPlace = subPlace || [];
  }

  toPrimitives() {
    return { place: this.place, subPlace: this.subPlace };
  }
}

export interface IPreference {
  place?: string;
  subPlace?: string[];
}
