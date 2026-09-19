import OpenAI from 'openai';
import { z } from 'zod';
import { studyCafeMetaZodSchema } from 'src/MSA/Place/entity/place.entity';
import {
    STUDY_CAFE_META_SYSTEM_PROMPT,
    STUDY_CAFE_SUMMARY_SYSTEM_PROMPT,
    buildStudyCafeMetaUserPrompt,
} from './studyCafeMeta.prompt';
import { applyKeywordMetaRules } from './keywordMetaRules';

export type StudyCafeMeta = z.infer<typeof studyCafeMetaZodSchema>;

export interface StudyCafeMetaResult {
    meta: StudyCafeMeta;
}

export class StudyCafeMetaGptAnalyzer {
    private readonly client: OpenAI;
    private readonly model: string;

    constructor(options?: { apiKey?: string; model?: string }) {
        const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error(
                'OPENAI_API_KEY가 없습니다. .env에 OPENAI_API_KEY를 설정하세요.',
            );
        }
        this.client = new OpenAI({ apiKey });
        this.model = options?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    }

    isEnabled(): boolean {
        return Boolean(process.env.OPENAI_API_KEY);
    }

    /**
     * GraphQL 배치 응답 배열 → operation별 객체로 정리
     * (getAnnouncements, getAiBriefing, getVisitorReviews, getVisitorReviewStats ×2)
     */
    static packGraphqlBatch(batchBody: unknown): Record<string, unknown> {
        const items = Array.isArray(batchBody) ? batchBody : [batchBody];
        const labels = [
            'announcements',
            'aiBriefing',
            'visitorReviews',
            'visitorReviewStats',
        ];

        const packed: Record<string, unknown> = {};
        items.forEach((item, i) => {
            const key = labels[i] ?? `response_${i}`;
            const data = (item as { data?: unknown })?.data ?? item;
            packed[key] = data;
        });
        return packed;
    }

    /** @param graphqlBatch cafe.ts에서 수집한 GraphQL 배치 응답 body (5개 operation 결과 배열) */
    async analyze(graphqlBatch: unknown): Promise<StudyCafeMetaResult> {
        const packed = StudyCafeMetaGptAnalyzer.packGraphqlBatch(graphqlBatch);

        const systemPrompt = STUDY_CAFE_META_SYSTEM_PROMPT;
        const userPrompt = buildStudyCafeMetaUserPrompt(packed);

        console.log(`\n[GPT] GraphQL 배치 분석 시작`);
        console.log(`[GPT] user 프롬프트 길이: ${userPrompt.length}`);

        const res = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        });

        const raw = res.choices[0]?.message?.content ?? '{}';
        console.log(`[GPT] 원본 응답:\n`, raw);

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error(`GPT JSON 파싱 실패: ${raw.slice(0, 200)}`);
        }

        // 좌석·화장실·가성비·주차·단체석·카공데이트는 GPT 대신 키워드 투표 기준 (keywordMetaRules.ts)
        const voted = (packed as any)?.visitorReviewStats?.visitorReviewStats
            ?.analysis?.votedKeyword;
        const meta = applyKeywordMetaRules(
            studyCafeMetaZodSchema.parse(parsed),
            voted?.details
                ? {
                      totalCount: Number(voted.totalCount) || 0,
                      details: voted.details.map((d: any) => ({
                          name: d.displayName,
                          count: Number(d.count) || 0,
                      })),
                  }
                : undefined,
        );
        console.log(`[GPT] studyCafeMeta:`, meta);
        return { meta };
    }

    /**
     * 카공 관점 요약 — "어바웃 AI" 리뷰 본문
     * @param evidence 선별한 카공·혼잡 리뷰, 키워드 투표, 네이버 AI 요약 문장
     */
    async summarize(evidence: string[]): Promise<string | undefined> {
        if (evidence.length === 0) return undefined;

        const res = await this.client.chat.completions.create({
            model: this.model,
            // 표현이 카페마다 틀에 박히지 않도록 특성 판단(0.2)보다 높게
            temperature: 0.7,
            messages: [
                { role: 'system', content: STUDY_CAFE_SUMMARY_SYSTEM_PROMPT },
                { role: 'user', content: evidence.join('\n') },
            ],
        });

        const summary = res.choices[0]?.message?.content
            ?.trim()
            .replace(/^["'“”]+|["'“”]+$/g, '');
        console.log(`[GPT] summary:`, summary);
        return summary || undefined;
    }
}
