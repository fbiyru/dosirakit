import Anthropic from '@anthropic-ai/sdk';
import { getKeywordData, getSerpResults, SerpCompetitor } from '@/lib/dataforseo/client';

export const CHAT_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'keyword_research',
    description:
      'Look up SEO data for a keyword: monthly search volume, keyword difficulty (KD), and the top 10 Google SERP results. Use this when the user mentions a potential keyword or topic to research.',
    input_schema: {
      type: 'object' as const,
      properties: {
        keyword: {
          type: 'string',
          description: 'The keyword or phrase to research',
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
  serp_results: SerpCompetitor[];
}

async function executeKeywordResearch(keyword: string): Promise<KeywordResearchResult> {
  const [keywordData, serpResults] = await Promise.all([
    getKeywordData(keyword),
    getSerpResults(keyword, 10),
  ]);

  return {
    keyword,
    volume: keywordData?.volume ?? 0,
    kd: keywordData?.kd ?? 0,
    serp_results: serpResults,
  };
}

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name === 'keyword_research') {
    const result = await executeKeywordResearch(input.keyword as string);
    return JSON.stringify(result);
  }
  return JSON.stringify({ error: `Unknown tool: ${name}` });
}
