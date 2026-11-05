import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

/**
 * 기존 멤버 평가 기록에서 서로 '최고예요'(great)를 남긴 쌍을 찾아 양쪽 friend에 서로를 추가한다.
 * 배포 이후의 평가는 linkFriendIfMutualGreat(src/MSA/User/core/services/mutualFriend.ts)가 처리한다.
 *   npm run backfill:mutual-friends                         미리보기 (DB 변경 없음)
 *   BACKFILL_APPLY=true npm run backfill:mutual-friends     DB 반영
 */
async function main(): Promise<void> {
  const apply = process.env.BACKFILL_APPLY === 'true';
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;
  const logs = db.collection('logtemperatures');
  const users = db.collection('users');

  const greatPairs = await logs
    .aggregate<{ _id: { from: string; to: string } }>([
      { $match: { sub: 'great' } },
      { $group: { _id: { from: '$from', to: '$to' } } },
    ])
    .toArray();

  const given = new Set(greatPairs.map(({ _id }) => `${_id.from}|${_id.to}`));
  const mutual: [string, string][] = [];
  for (const { _id } of greatPairs) {
    const { from, to } = _id;
    if (!from || !to || from === to) continue;
    // 쌍을 한 번만 세기 위해 from < to 인 쪽만 남긴다
    if (from < to && given.has(`${to}|${from}`)) mutual.push([from, to]);
  }

  const uids = [...new Set(mutual.flat())];
  const docs = await users
    .find({ uid: { $in: uids } }, { projection: { uid: 1, friend: 1 } })
    .toArray();
  const friendMap = new Map<string, Set<string>>(
    docs.map((d) => [d.uid as string, new Set((d.friend ?? []) as string[])]),
  );

  const ops: any[] = [];
  let alreadyFriends = 0;
  let missingUser = 0;
  for (const [a, b] of mutual) {
    if (!friendMap.has(a) || !friendMap.has(b)) {
      missingUser++;
      continue;
    }
    const aHasB = friendMap.get(a)!.has(b);
    const bHasA = friendMap.get(b)!.has(a);
    if (aHasB && bHasA) {
      alreadyFriends++;
      continue;
    }
    if (!aHasB)
      ops.push({ updateOne: { filter: { uid: a }, update: { $addToSet: { friend: b } } } });
    if (!bHasA)
      ops.push({ updateOne: { filter: { uid: b }, update: { $addToSet: { friend: a } } } });
  }

  console.log(`great 평가 쌍(방향 있음) ${greatPairs.length}개`);
  console.log(`서로 great인 쌍 ${mutual.length}개`);
  console.log(`  이미 서로 친구 ${alreadyFriends} | 탈퇴 등으로 유저 없음 ${missingUser}`);
  console.log(`  friend 추가 대상 ${ops.length}건 (한쪽 방향 1건)`);

  if (apply && ops.length > 0) {
    const res = await users.bulkWrite(ops);
    console.log(`DB 반영 완료: ${res.modifiedCount}건`);
  } else if (!apply) {
    console.log('미리보기만 실행 — 반영하려면 BACKFILL_APPLY=true');
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('backfill 실패:', error);
  process.exit(1);
});
