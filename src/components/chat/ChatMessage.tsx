'use client';

import { KeywordResearchCard } from './KeywordResearchCard';

interface ToolCallData {
  type: 'tool_call' | 'tool_result';
  name: string;
  input?: Record<string, unknown>;
  data?: {
    keyword: string;
    volume: number;
    kd: number;
    serp_results: {
      position: number;
      url: string;
      title: string;
      description: string;
    }[];
  };
}

export interface ChatMessageData {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallData[];
}

interface ChatMessageProps {
  message: ChatMessageData;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] ${
          isUser
            ? 'bg-accent-light text-text rounded-2xl rounded-br-md px-4 py-3'
            : 'bg-surface border border-border text-text rounded-2xl rounded-bl-md px-4 py-3'
        }`}
      >
        {message.toolCalls?.map((tc, i) => {
          if (tc.type === 'tool_result' && tc.name === 'keyword_research' && tc.data) {
            return (
              <KeywordResearchCard
                key={i}
                keyword={tc.data.keyword}
                volume={tc.data.volume}
                kd={tc.data.kd}
                serp_results={tc.data.serp_results}
              />
            );
          }
          if (tc.type === 'tool_call' && tc.name === 'keyword_research') {
            return (
              <div
                key={i}
                className="text-xs text-text-muted italic my-1"
              >
                Researching &ldquo;{(tc.input as { keyword: string })?.keyword}&rdquo;...
              </div>
            );
          }
          return null;
        })}

        {message.content && (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
