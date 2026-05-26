// src/openai/openai.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ContentDraftService } from './content-draft.service';
import { OpenAIService } from './gpt.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OpenAI,
      useFactory: (cfg: ConfigService) => {
        const apiKey =
          cfg.get<string>('OPENAI_API_KEY') ?? process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return new OpenAI({ apiKey: 'missing' });
        }
        return new OpenAI({ apiKey });
      },
      inject: [ConfigService],
    },
    OpenAIService,
    ContentDraftService,
  ],
  exports: [OpenAIService, ContentDraftService],
})
export class OpenAIModule {}
