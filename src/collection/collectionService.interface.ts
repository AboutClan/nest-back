export interface ISetCollectionStampResult {
  alphabet: string | null;
  stamps: number;
}

export interface ICollectionService {
  setCollectionStamp(id: string): Promise<ISetCollectionStampResult>;

  changeCollection(
    mine: string,
    opponent: string,
    myId: string,
    toUid: string,
  ): Promise<string | null>;

  setCollection(alphabet: string): Promise<null>;

  setCollectionCompleted(): Promise<string | void>;

  getCollection(): Promise<any>; // Replace `any` with appropriate type if available

  getCollectionAll(): Promise<any[]>; // Replace `any` with appropriate type if available
}
