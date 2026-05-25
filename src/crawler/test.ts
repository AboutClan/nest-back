import * as fs from 'fs';
import * as path from 'path';

const HOURS_KEYS = [
    'businessHours',
    'operatingHours',
    'bizHours',
    'openingHours',
    'schedule',
] as const;

/** GraphQL 응답 JSON에서 영업시간(openingHours) 형태 배열 탐색 */
export function extractOpeningHoursFromGraphql(data: unknown): string[][] {
    const results: string[][] = [];

    const walk = (node: unknown): void => {
        if (!node || typeof node !== 'object') return;

        if (Array.isArray(node)) {
            node.forEach(walk);
            return;
        }

        const obj = node as Record<string, unknown>;

        for (const key of HOURS_KEYS) {
            const val = obj[key];
            if (Array.isArray(val) && val.length > 0) {
                const parsed = parseHoursArray(val);
                if (parsed.length > 0) {
                    results.push(...parsed);
                }
            }
        }

        Object.values(obj).forEach(walk);
    };

    walk(data);
    return results;
}

export function parseHoursArray(val: unknown[]): string[][] {
    const rows: string[][] = [];
    for (const item of val) {
        if (Array.isArray(item)) {
            const texts = item
                .map((v) => (typeof v === 'string' ? v : String(v ?? '')))
                .filter(Boolean);
            if (texts.length >= 2) rows.push(texts);
        } else if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>;
            const day =
                (o.day as string) ??
                (o.weekday as string) ??
                (o.dayName as string) ??
                '';
            const time =
                (o.businessHours as string) ??
                (o.hours as string) ??
                (o.time as string) ??
                (o.description as string) ??
                '';
            if (day && time) rows.push([day, time]);
        }
    }
    return rows;
}

/** GraphQL 배치 응답 배열에서 openingHours 추출 (첫 매칭 반환) */
export function extractOpeningHoursFromBatch(
    batchResponses: unknown[],
): string[][] {
    for (const res of batchResponses) {
        const found = extractOpeningHoursFromGraphql(res);
        if (found.length > 0) {
            return found;
        }
    }
    return [];
}

function loadGraphqlJson(filePath: string): unknown {
    const abs = path.resolve(filePath);
    const raw = fs.readFileSync(abs, 'utf8');
    return JSON.parse(raw);
}

function normalizeToBatchResponses(data: unknown): unknown[] {
    if (Array.isArray(data)) {
        return data;
    }
    const wrapped = data as { body?: unknown };
    if (Array.isArray(wrapped.body)) {
        return wrapped.body;
    }
    return [data];
}

/**
 * 사용법:
 *   npx ts-node -r tsconfig-paths/register src/crawler/test.ts <graphql.json>
 *
 * graphql.json — cafe.ts Node 배치 응답(JSON 배열) 또는 단일 응답 객체
 */
async function main(): Promise<void> {
    const fileArg = process.argv[2];

    if (!fileArg) {
        console.log('사용법: npx ts-node -r tsconfig-paths/register src/crawler/test.ts <graphql.json>');
        console.log('\n예시(인라인 샘플):');
        const sample = [
            {
                data: {
                    openingHours: [
                        ['월', '09:00 - 22:00'],
                        ['화', '09:00 - 22:00'],
                    ],
                },
            },
        ];
        const hours = extractOpeningHoursFromBatch(sample);
        console.log('추출 결과:', JSON.stringify(hours, null, 2));
        process.exit(0);
    }

    const data = loadGraphqlJson(fileArg);
    const batch = normalizeToBatchResponses(data);
    const openingHours = extractOpeningHoursFromBatch(batch);

    console.log(`입력: ${fileArg}`);
    console.log(`배치 응답 수: ${batch.length}`);
    console.log('추출된 openingHours:\n', JSON.stringify(openingHours, null, 2));
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
