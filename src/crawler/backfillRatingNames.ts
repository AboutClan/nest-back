import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

/**
 * place.ratings[].name을 작성 회원의 현재 닉네임으로 맞춤 (후기 작성자 표시용)
 *   npm run crawl:backfill-rating-names              미리보기 (DB 변경 없음)
 *   BACKFILL_APPLY=true npm run crawl:backfill-rating-names   DB 반영
 *
 * 기본은 이름이 비었거나 '익명'인 후기만 바꾼다. 다른 이름이 적힌 후기(운영진 대리 작성 등)까지
 * 바꾸려면 BACKFILL_OVERWRITE_NAMES=true
 * 제외: '어바웃 AI' 항목, user 없음, 공용 게스트 계정, 닉네임이 없는 회원
 */
const GUEST_USER_ID = '69c4f9ce862f5d10130252ab';
const AI_NAME = '어바웃 AI';

async function main(): Promise<void> {
  const apply = process.env.BACKFILL_APPLY === 'true';
  const overwriteNames = process.env.BACKFILL_OVERWRITE_NAMES === 'true';
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;
  const places = db.collection('places');
  const users = db.collection('users');

  const docs = await places
    .find(
      { 'ratings.0': { $exists: true } },
      { projection: { ratings: 1, 'location.name': 1 } },
    )
    .toArray();

  const userIds = new Set<string>();
  for (const doc of docs) {
    for (const r of doc.ratings ?? []) {
      if (r?.user) userIds.add(String(r.user));
    }
  }
  const userDocs = await users
    .find(
      {
        _id: { $in: [...userIds].map((id) => new mongoose.Types.ObjectId(id)) },
      },
      { projection: { nickname: 1 } },
    )
    .toArray();
  const nicknameById = new Map<string, string>();
  for (const u of userDocs) {
    const nickname = typeof u.nickname === 'string' ? u.nickname.trim() : '';
    if (nickname) nicknameById.set(String(u._id), nickname);
  }

  const count = {
    total: 0,
    ai: 0,
    noUser: 0,
    guest: 0,
    noNickname: 0,
    same: 0,
  };
  const changeByKind = { empty: 0, anonymous: 0, other: 0 };
  const otherSamples: string[] = [];
  const ops: any[] = [];

  for (const doc of docs) {
    const set: Record<string, string> = {};
    (doc.ratings ?? []).forEach((r: any, i: number) => {
      count.total++;
      if (r?.name === AI_NAME) return void count.ai++;
      if (!r?.user) return void count.noUser++;
      const userId = String(r.user);
      if (userId === GUEST_USER_ID) return void count.guest++;
      const nickname = nicknameById.get(userId);
      if (!nickname) return void count.noNickname++;
      const current = typeof r.name === 'string' ? r.name.trim() : '';
      if (current === nickname) return void count.same++;

      if (!current) changeByKind.empty++;
      else if (current === '익명') changeByKind.anonymous++;
      else {
        changeByKind.other++;
        if (otherSamples.length < 20) {
          otherSamples.push(
            `${doc.location?.name ?? doc._id} | "${current}" → "${nickname}"`,
          );
        }
        if (!overwriteNames) return;
      }
      set[`ratings.${i}.name`] = nickname;
    });
    if (Object.keys(set).length > 0) {
      ops.push({
        updateOne: { filter: { _id: doc._id }, update: { $set: set } },
      });
    }
  }

  const changed =
    changeByKind.empty +
    changeByKind.anonymous +
    (overwriteNames ? changeByKind.other : 0);
  console.log(`place ${docs.length}곳 · 후기 ${count.total}건`);
  console.log(
    `제외: 어바웃 AI ${count.ai} / user 없음 ${count.noUser} / 게스트 ${count.guest} / 닉네임 없는 회원 ${count.noNickname} / 이미 닉네임 ${count.same}`,
  );
  console.log(
    `변경 대상 ${changed}건 (place ${ops.length}곳): 빈 값 ${changeByKind.empty} / '익명' ${changeByKind.anonymous} / 다른 이름 ${changeByKind.other}${overwriteNames ? '' : ' (유지 — BACKFILL_OVERWRITE_NAMES=true면 변경)'}`,
  );
  if (otherSamples.length) {
    console.log('다른 이름 → 닉네임 예시:');
    otherSamples.forEach((line) => console.log(`  ${line}`));
  }

  if (apply && ops.length > 0) {
    const res = await places.bulkWrite(ops);
    console.log(`DB 반영 완료: place ${res.modifiedCount}곳`);
  } else if (!apply) {
    console.log('미리보기만 실행 — 반영하려면 BACKFILL_APPLY=true');
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('backfill 실패:', error);
  process.exit(1);
});
