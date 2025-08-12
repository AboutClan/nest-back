// src/openai/openai.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { OpenAIService } from './gpt.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OpenAI,
      useFactory: (cfg: ConfigService) =>
        new OpenAI({
          apiKey: cfg.getOrThrow<string>('OPENAI_API_KEY'),
          baseURL: 'https://api.openai.com/v1',
        }),
      inject: [ConfigService],
    },
    OpenAIService,
  ],
  exports: [OpenAIService],
})
export class OpenAIModule {}
