export interface ICounterService {
  getNextSequence(name: any): Promise<any>;
  setCounter(key: string, location: string): any;
  getCounter(key: string, location: string): any;
}
