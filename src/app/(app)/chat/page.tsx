'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ChatMessage, ChatMessageData } from '@/components/chat/ChatMessage';
import { Send, Loader2, FileText } from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [hasResearch, setHasResearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function getBrandId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('activeBrandId');
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const brandId = getBrandId();
    if (!brandId) return;

    const userMessage: ChatMessageData = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const assistantMessage: ChatMessageData = {
      role: 'assistant',
      content: '',
      toolCalls: [],
    };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, brand_id: brandId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err.error || 'Something went wrong. Please try again.',
          };
          return updated;
        });
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === 'tool_call') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = { ...updated[updated.length - 1] };
                last.toolCalls = [
                  ...(last.toolCalls || []),
                  { type: 'tool_call', name: event.name, input: event.input },
                ];
                updated[updated.length - 1] = last;
                return updated;
              });
            } else if (event.type === 'tool_result') {
              setHasResearch(true);
              setMessages((prev) => {
                const updated = [...prev];
                const last = { ...updated[updated.length - 1] };
                last.toolCalls = [
                  ...(last.toolCalls || []),
                  { type: 'tool_result', name: event.name, data: event.data },
                ];
                updated[updated.length - 1] = last;
                return updated;
              });
            } else if (event.type === 'text_delta') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = { ...updated[updated.length - 1] };
                last.content = (last.content || '') + event.text;
                updated[updated.length - 1] = last;
                return updated;
              });
            } else if (event.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = { ...updated[updated.length - 1] };
                last.content = event.error;
                updated[updated.length - 1] = last;
                return updated;
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Network error. Please check your connection and try again.',
        };
        return updated;
      });
    }

    setLoading(false);
  }

  async function handleCreatePlan() {
    const brandId = getBrandId();
    if (!brandId || creatingPlan) return;

    setCreatingPlan(true);

    try {
      const apiMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat/create-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, brand_id: brandId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create plan' }));
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Failed to create plan: ${err.error}`,
          },
        ]);
        setCreatingPlan(false);
        return;
      }

      const { article_id } = await res.json();
      router.push(`/article/${article_id}/story`);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to create plan. Please try again.',
        },
      ]);
      setCreatingPlan(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-display text-xl font-semibold text-text">
              Dosirakit Bot
            </h1>
            <p className="text-sm text-text-muted">
              Brainstorm topics and validate keywords with real SEO data
            </p>
          </div>
          {hasResearch && (
            <button
              onClick={handleCreatePlan}
              disabled={creatingPlan || loading}
              className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating plan...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Create article from this plan
                </>
              )}
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h2 className="font-display text-lg font-semibold text-text mb-2">
                What shall we write about?
              </h2>
              <p className="text-text-muted text-sm max-w-md">
                Tell me a topic idea and I&apos;ll research the keywords, check
                what&apos;s ranking, and help you build a plan.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg}
              isStreaming={loading && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-border px-6 py-4 shrink-0">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a topic idea..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors duration-200 text-sm disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-accent text-white p-3 rounded-xl hover:bg-accent-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-text-muted text-center mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </AppShell>
  );
}
