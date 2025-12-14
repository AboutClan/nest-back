export interface FcmLogRepository {
  createLog(data: any): Promise<null>;
}
