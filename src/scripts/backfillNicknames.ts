import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { pickRandomNickname } from 'src/MSA/User/core/domain/User/randomNickname';

dotenv.config();

/**
 * 닉네임이 없는 어바웃 회원(cafe_user 제외)에게 랜덤 닉네임 부여
 *   npm run user:backfill-nicknames                        미리보기 (DB 변경 없음)
 *   BACKFILL_APPLY=true npm run user:backfill-nicknames    DB 반영
 *
 * 최근 활동한 회원부터 부여해, 활동이 오래된 회원일수록 뒤에 숫자가 붙는다.
 * 활동 시각 = logs(포인트·점수 기록)의 마지막 기록. 회원 행동이 아닌 일괄 기록은 제외.
 * 기록이 없는 회원은 그 뒤에 최근 가입 순.
 * 이미 쓰이는 닉네임(카공지도 회원 포함)과 겹치지 않는다.
 */
const SYSTEM_LOG_MESSAGES = [
  '월간 최소 활동 미달',
  '소모임 가입(또는 유지)',
  '활동 제한 방지를 위한 1회 한정 지원금',
  '포인트 오류 복구 보상',
];

const NO_NICKNAME = [
  { nickname: { $exists: false } },
  { nickname: null },
  { nickname: '' },
];

async function main(): Promise<void> {
  const apply = process.env.BACKFILL_APPLY === 'true';
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;
  const users = db.collection('users');

  const used = new Set<string>(
    (
      await users.distinct('nickname', {
        nickname: { $exists: true, $nin: [null, ''] },
      })
    ).map(String),
  );
  const existingCount = used.size;

  const lastActivity = new Map<string, number>();
  const logs = await db
    .collection('logs')
    .aggregate([
      { $match: { message: { $nin: SYSTEM_LOG_MESSAGES } } },
      { $group: { _id: '$meta.uid', t: { $max: '$timestamp' } } },
    ])
    .toArray();
  for (const l of logs) {
    if (l._id && l.t) lastActivity.set(String(l._id), new Date(l.t).getTime());
  }

  const targets = await users
    .find(
      { role: { $ne: 'cafe_user' }, $or: NO_NICKNAME },
      { projection: { _id: 1, uid: 1, name: 1, role: 1 } },
    )
    .toArray();

  // 최근 활동 순 → 활동 기록 없으면 최근 생성 순
  targets.sort((a, b) => {
    const ta = lastActivity.get(String(a.uid)) ?? -1;
    const tb = lastActivity.get(String(b.uid)) ?? -1;
    if (ta !== tb) return tb - ta;
    return b._id.getTimestamp().getTime() - a._id.getTimestamp().getTime();
  });

  const rows = targets.map((u) => ({
    u,
    nickname: pickRandomNickname(used),
    active: lastActivity.get(String(u.uid)),
  }));

  const plain = rows.filter((r) => !/\d$/.test(r.nickname)).length;
  const withLog = rows.filter((r) => r.active).length;
  console.log(
    `기존 닉네임 ${existingCount}개 · 부여 대상 ${rows.length}명 (활동 기록 있음 ${withLog}명)`,
  );
  console.log(`숫자 없는 닉네임 ${plain}명 · 숫자 붙는 닉네임 ${rows.length - plain}명`);
  const show = (r: (typeof rows)[number], i: number) =>
    console.log(
      `  ${i + 1}. ${r.u.name ?? r.u._id} (${r.u.role}, ${
        r.active ? new Date(r.active).toISOString().slice(0, 10) : '기록 없음'
      }) → ${r.nickname}`,
    );
  rows.slice(0, 10).forEach(show);
  console.log('  …');
  rows.slice(plain - 2, plain + 3).forEach((r, i) => show(r, plain - 2 + i));
  console.log('  …');
  rows.slice(-3).forEach((r, i) => show(r, rows.length - 3 + i));

  if (apply && rows.length > 0) {
    const res = await users.bulkWrite(
      rows.map(({ u, nickname }) => ({
        updateOne: {
          filter: { _id: u._id, $or: NO_NICKNAME },
          update: { $set: { nickname } },
        },
      })),
    );
    console.log(`DB 반영 완료: ${res.modifiedCount}명`);
  } else if (!apply) {
    console.log('미리보기만 실행 — 반영하려면 BACKFILL_APPLY=true');
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('backfill 실패:', error);
  process.exit(1);
});
