import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  buildContentDraftUserPrompt,
  GATHER_DRAFT_SYSTEM_PROMPT,
  GROUP_STUDY_DRAFT_SYSTEM_PROMPT,
} from './content-draft.prompt';
import { PostDraftResult } from './content-draft.dto';
import { OpenAIService } from './gpt.service';

@Injectable()
export class ContentDraftService {
  constructor(private readonly openaiService: OpenAIService) {}

  async generateGatherDraft(text: string): Promise<PostDraftResult> {
    return this.generateDraft(text, GATHER_DRAFT_SYSTEM_PROMPT);
  }

  async generateGroupStudyDraft(text: string): Promise<PostDraftResult> {
    return this.generateDraft(text, GROUP_STUDY_DRAFT_SYSTEM_PROMPT);
  }

  private async generateDraft(
    text: string,
    systemPrompt: string,
  ): Promise<PostDraftResult> {
    const trimmed = text?.trim();
    if (!trimmed) {
      throw new BadRequestException('text가 비어 있습니다.');
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY가 설정되지 않았습니다.',
      );
    }

    try {
      const raw = await this.openaiService.structured<PostDraftResult>(
        systemPrompt,
        buildContentDraftUserPrompt(trimmed),
        {},
      );

      const title = raw.title?.trim();
      const content = raw.content?.trim();
      if (!title || !content) {
        throw new BadRequestException('AI 응답에 title 또는 content가 없습니다.');
      }

      return { title, content };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      throw new ServiceUnavailableException(
        'AI 글 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
  }
}
