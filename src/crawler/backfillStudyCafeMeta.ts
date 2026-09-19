import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  applyKeywordMetaRules,
  is24HoursFromOperatingHours,
  KEYWORD_META_RULES,
} from './studyCafeMeta/keywordMetaRules';

dotenv.config();

/**
 * 저장된 naverKeywords·operatingHours로 studyCafeMeta 규칙 필드를 재계산 (재크롤링 없이)
 *   npm run crawl:backfill-meta              미리보기 (DB 변경 없음)
 *   BACKFILL_APPLY=true npm run crawl:backfill-meta   DB 반영
 *
 * 규칙 필드: keywordMetaRules.ts의 KEYWORD_META_RULES + goodForDate + is24Hours
 * 키워드 투표·영업시간이 없는 place는 해당 필드를 건드리지 않음
 */
const RULE_FIELDS = [...Object.keys(KEYWORD_META_RULES), 'goodForDate', 'is24Hours'];

async function main(): Promise<void> {
  const apply = process.env.BACKFILL_APPLY === 'true';
  await mongoose.connect(process.env.MONGODB_URI as string);
  const places = mongoose.connection.db!.collection('places');

  const docs = await places
    .find({}, { projection: { studyCafeMeta: 1, naverKeywords: 1, operatingHours: 1 } })
    .toArray();

  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  const ops: any[] = [];

  for (const doc of docs) {
    const meta = (doc.studyCafeMeta ?? {}) as Record<string, unknown>;
    const next: Record<string, unknown> = applyKeywordMetaRules(meta, doc.naverKeywords);
    const is24Hours = is24HoursFromOperatingHours(doc.operatingHours);
    if (is24Hours !== undefined) next.is24Hours = is24Hours;

    const set: Record<string, unknown> = {};
    for (const field of RULE_FIELDS) {
      if (meta[field]) before[field] = (before[field] ?? 0) + 1;
      if (next[field]) after[field] = (after[field] ?? 0) + 1;
      if (next[field] !== undefined && next[field] !== meta[field]) {
        set[`studyCafeMeta.${field}`] = next[field];
      }
    }
    if (Object.keys(set).length > 0) {
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
    }
  }

  console.log(`전체 ${docs.length}곳 | 변경 대상 ${ops.length}곳`);
  console.log('필드 | 현재 true → 규칙 적용 후 true');
  for (const field of RULE_FIELDS) {
    console.log(`${field} | ${before[field] ?? 0} → ${after[field] ?? 0}`);
  }

  if (apply && ops.length > 0) {
    const res = await places.bulkWrite(ops);
    console.log(`DB 반영 완료: ${res.modifiedCount}곳`);
  } else if (!apply) {
    console.log('미리보기만 실행 — 반영하려면 BACKFILL_APPLY=true');
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('backfill 실패:', error);
  process.exit(1);
});
