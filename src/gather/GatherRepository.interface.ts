export interface IGatherRepository {
  findById(gatherId: string);
  findByIdJoin(gatherId: string);
  getEnthMembers();
}
