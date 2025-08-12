// src/openai/openai.service.ts
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly defaultModel: string;

  constructor(private readonly openai: OpenAI) {
    // 환경 변수 못 읽는 상황 대비(컨트롤러에서 주입 가능하게도 설계)
    this.defaultModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  }

  /**
   * 1) 기본 텍스트 응답 (Chat/Responses API 스타일)
   */
  async generateText(
    prompt: string,
    opts?: { model?: string; temperature?: number },
  ) {
    const model = opts?.model ?? this.defaultModel;
    const temperature = opts?.temperature ?? 0.3;

    // Chat Completions 예시
    const res = await this.openai.chat.completions.create({
      model,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.choices[0]?.message?.content ?? '';
  }

  /**
   * 2) 스트리밍 (Server-sent events로 프록시 하거나, 내부에서 chunk로 합치기)
   * 컨트롤러에서 stream에 바로 파이프할 수도 있음.
   */
  async streamText(prompt: string, opts?: { model?: string }) {
    const model = opts?.model ?? this.defaultModel;

    const stream = await this.openai.chat.completions.create({
      model,
      stream: true, // SDK가 AsyncIterable 반환
      messages: [{ role: 'user', content: prompt }],
    });

    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? '';
      if (delta) full += delta;
      // 여기서 onChunk 콜백을 받아 WebSocket/SSE로 push하도록 설계도 가능
    }
    return full;
  }

  /**
   * 구조적 출력(JSON 강제) — 모델이 JSON으로만 답하게
   * (SDK의 구조화 출력/JSON 모드 가이드 참고)
   */
  async structured<T extends object>(
    system: string,
    user: string,
    schema: object,
  ) {
    const res = await this.openai.chat.completions.create({
      model: this.defaultModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // JSON 모드: 모델이 유효한 JSON만 내도록 강제
      response_format: { type: 'json_object' },
      // 추가로 schema를 설명에 포함하거나, 함수 툴로 strict하게도 가능
    });

    const text = res.choices[0]?.message?.content ?? '{}';
    return JSON.parse(text) as T;
  }

  /**
   * 5) 임베딩
   */
  async embed(inputs: string | string[], model = 'text-embedding-3-small') {
    const { data } = await this.openai.embeddings.create({
      model,
      input: inputs,
    });
    return data.map((d) => d.embedding);
  }

  /**
   * 6) 이미지 생성(필요 시)
   */
  async generateImage(
    prompt: string,
    opts?: { size?: '256x256' | '512x512' | '1024x1024' },
  ) {
    const size = opts?.size ?? '1024x1024';
    const res = await this.openai.images.generate({ prompt, size });
    return res.data[0]?.url ?? '';
  }

  // --- 예시용 더미 ---
  private async fakeWeather(city: string, unit: 'c' | 'f') {
    return { city, unit, temp: unit === 'c' ? 26 : 79, desc: 'sunny' };
  }
}
