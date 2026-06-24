import Anthropic from '@anthropic-ai/sdk';
import { getKeywordData, getSerpResults, SerpCompetitor } from '@/lib/dataforseo/client';

export const CHAT_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'keyword_research',
    description:
      'Look up SEO data for a keyword: monthly search volume and keyword difficulty (KD). Use this when the user mentions a potential keyword or topic to research.',
    input_schema: {
      type: 'object' as const,
      properties: {
        keyword: {
          type: 'string',
          description: 'The keyword or phrase to research',
        },
        include_serp: {
          type: 'boolean',
          description: 'Set to true to also fetch the top 10 Google SERP results. Only use when the user explicitly asks to see what is currently ranking, or when analysing competition. Defaults to false to save API costs.',
        },
      },
      required: ['keyword'],
    },
  },
];

export interface KeywordResearchResult {
  keyword: string;
  volume: number;
  kd: number;
  serp_results?: SerpCompetitor[];
}

async function executeKeywordResearch(
  keyword: string,
  includeSerpResults: boolean
): Promise<KeywordResearchResult> {
  const keywordData = await getKeywordData(keyword);

  const result: KeywordResearchResult = {
    keyword,
    volume: keywordData?.volume ?? 0,
    kd: keywordData?.kd ?? 0,
  };

  if (includeSerpResults) {
    result.serp_results = await getSerpResults(keyword, 10);
  }

  return result;
}

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name === 'keyword_research') {
    const result = await executeKeywordResearch(
      input.keyword as string,
      (input.include_serp as boolean) ?? false
    );
    return JSON.stringify(result);
  }
  return JSON.stringify({ error: `Unknown tool: ${name}` });
}
