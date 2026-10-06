import { Vote2 } from "../domain/Vote2/Vote2";

export interface IVote2Repository {
  findByDate(date: string, isPopulate?: boolean): Promise<Vote2 | null>;
  findByDateWithoutPopulate(date: string): Promise<Vote2 | null>;
  findById(id: string): Promise<Vote2 | null>;
  save(vote2: Vote2): Promise<void>;
  findParticipationsByDate(date: string): Promise<any>;
  getVoteByPeriod(startDay: string, endDay: string);
  findAllUserIdsAfterDate(date: string): Promise<string[]>;
  /** 지역 멤버 집계용. 신청 주소·출석 여부·장소 주소만 가볍게 읽는다(lean). */
  getRegionActivityRaw(startDay: string): Promise<any[]>;
  findMineById(userId: string): Promise<Vote2[]>;
  /** participations에 원자적으로 추가한다(문서 전체를 다시 쓰지 않는다). */
  pushParticipations(date: string, participations: any[]): Promise<void>;
  /** participations에서 원자적으로 뺀다(문서 전체를 다시 쓰지 않는다). */
  pullParticipations(date: string, userIds: string[]): Promise<void>;
  getCrewStatsRaw(
    userIds: string[],
    startDay: string,
    endDay: string,
  ): Promise<
    {
      date: string;
      participations: { userId: string }[];
      results: { members: { userId: string }[] }[];
    }[]
  >;
}
