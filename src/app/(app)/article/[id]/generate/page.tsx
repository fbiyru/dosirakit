'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const MESSAGES = [
  'Drafting your article...',
  'Optimising for SEO...',
  'Adding the finishing touches...',
  'Almost ready...',
];

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
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
    generateArticle();
  }, []);

  async function generateArticle() {
    setError('');

    try {
      const supabase = createClient();

      // Get the selected angle
      const { data: angles } = await supabase
        .from('article_angles')
        .select('id')
        .eq('article_id', articleId)
        .eq('selected', true)
        .limit(1);

      const angleId = angles?.[0]?.id;
      if (!angleId) {
        setError('No angle selected. Please go back and select an angle.');
        return;
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, angle_id: angleId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Generation failed');
      }

      // Consume the stream and check for mid-stream errors
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

      // Check if stream contained an error marker
      const errorMatch = streamedText.match(/<!--STREAM_ERROR:(.*?)-->/);
      if (errorMatch) {
        const streamError = JSON.parse(errorMatch[1]);
        throw new Error(streamError.error);
      }

      // Redirect to review
      router.push(`/article/${articleId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong during generation.');
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center px-4">
        {error ? (
          <div className="space-y-4">
            <p className="text-destructive text-lg">{error}</p>
            <Button onClick={() => { started.current = false; generateArticle(); }}>
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* Spinner */}
            <div className="mb-8">
              <div className="w-16 h-16 mx-auto border-4 border-border border-t-accent rounded-full animate-spin" />
            </div>

            <p className="text-xl text-text font-display font-semibold mb-2">
              {MESSAGES[messageIndex]}
            </p>
            <p className="text-text-muted text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              This usually takes 15-30 seconds
            </p>
          </>
        )}
      </div>
    </div>
  );
}
