'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const MESSAGES = [
  'Analysing the original article…',
  'Checking top-ranking competitors…',
  'Rewriting to match your brand voice…',
  'Optimising keyword placement…',
  'Adding the finishing touches…',
  'Almost ready…',
];

function ProcessingInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleId = params.id as string;
  const skipSerp = searchParams.get('skip_serp') === '1';

  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runRewrite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runRewrite() {
    setError('');
    try {
      const res = await fetch('/api/rewrite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: articleId,
          run_serp_analysis: !skipSerp,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Rewrite failed');
      }

      // Consume stream and check for errors
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) streamedText += decoder.decode(value, { stream: true });
        }
      }

      const errorMatch = streamedText.match(/<!--STREAM_ERROR:(.*?)-->/);
      if (errorMatch) {
        const streamError = JSON.parse(errorMatch[1]);
        throw new Error(streamError.error);
      }

      router.push(`/article/${articleId}/review`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong during the rewrite.'
      );
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center px-4">
        {error ? (
          <div className="space-y-4">
            <p className="text-destructive text-lg">{error}</p>
            <Button
              onClick={() => {
                started.current = false;
                runRewrite();
              }}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="w-16 h-16 mx-auto border-4 border-border border-t-accent rounded-full animate-spin" />
            </div>

            <p className="text-xl text-text font-display font-semibold mb-2">
              {MESSAGES[messageIndex]}
            </p>
            <p className="text-text-muted text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {skipSerp
                ? 'This usually takes 15–30 seconds'
                : 'SERP analysis + rewrite may take 30–60 seconds'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function RewriteProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      }
    >
      <ProcessingInner />
    </Suspense>
  );
}
