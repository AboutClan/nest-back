export class Temperature {
  constructor(
    public temperature?: number,
    public sum?: number,
    public cnt?: number,
  ) {
    this.temperature = temperature ?? 36.5;
    this.sum = sum ?? 0;
    this.cnt = cnt ?? 0;
  }

  setTemperature(temperature: number, sum: number, cnt: number): void {
    this.temperature = 36.5 + temperature;
    this.sum = sum;
    this.cnt = cnt;
  }

  toPrimitives() {
    return { temperature: this.temperature, sum: this.sum, cnt: this.cnt };
  }
}

export interface ITemperature {
  temperature?: number;
  sum?: number;
  cnt?: number;
}
