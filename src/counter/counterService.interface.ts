export interface ICounterService {
  getNextSequence(name: any): Promise<any>;
}
