'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface BriefBanner {
  keyword: string;
  opportunityId: string;
}

function NewArticleContent() {
  const searchParams = useSearchParams();
  const fromBriefId = searchParams.get('from_brief');

  const [keyword, setKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [notes, setNotes] = useState('');
  const [generateImagePrompts, setGenerateImagePrompts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [briefBanner, setBriefBanner] = useState<BriefBanner | null>(null);
  const router = useRouter();

  // Pre-fill keyword from brief opportunity
  useEffect(() => {
    if (!fromBriefId) return;

    async function loadOpportunity() {
      const res = await fetch(`/api/briefs?opportunity_id=${fromBriefId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.brief) return;

      const primaryKeyword =
        data.brief.brief_content?.primary_keyword as string | undefined;
      if (primaryKeyword) {
        setKeyword(primaryKeyword);
        setBriefBanner({ keyword: primaryKeyword, opportunityId: fromBriefId! });
      }
    }

    loadOpportunity();
  }, [fromBriefId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      const brandId = localStorage.getItem('activeBrandId');
      if (!brandId) {
        toast.error('No active brand selected');
        return;
      }

      const res = await fetch('/api/angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus_keyword: keyword.trim(),
          secondary_keywords: secondaryKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          user_notes: notes.trim() || null,
          brand_id: brandId,
          generate_image_prompts: generateImagePrompts,
          opportunity_id: fromBriefId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === 'billing_error') {
          throw new Error(
            'Your Anthropic API credits have run out. Please top up at console.anthropic.com.'
          );
        }
        throw new Error(data.error || 'Failed to generate angles');
      }

      const data = await res.json();
      router.push(`/article/${data.article_id}/angles`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="w-full max-w-xl">
          <h1 className="font-display text-3xl font-bold text-text text-center mb-8">
            What are we writing about today?
          </h1>

          {briefBanner && (
            <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-accent-light border border-accent/20">
              <FileText className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-accent-dark">
                  Writing from brief
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Your content brief for &ldquo;{briefBanner.keyword}&rdquo; will be
                  injected into the article generation prompt.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Focus Keyword or Topic"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. tteokbokki recipe, how to make kimchi at home"
              required
            />

            <Textarea
              label="Secondary Keywords"
              hint="Optional — paste or type keywords separated by commas"
              value={secondaryKeywords}
              onChange={(e) => setSecondaryKeywords(e.target.value)}
              placeholder="e.g. gochujang sauce, korean street food, spicy rice cakes, tteok recipe"
              className="min-h-[60px]"
            />

            <Textarea
              label="Anything else the AI should know?"
              hint="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. I want this to be beginner-friendly. Target audience is non-Koreans curious about Korean food."
            />

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generateImagePrompts}
                onChange={(e) => setGenerateImagePrompts(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-text">
                Generate AI image prompts (blog, Pinterest, Instagram/TikTok)
              </span>
            </label>

            <Button
              type="submit"
              disabled={loading || !keyword.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking up angles...
                </>
              ) : (
                'Generate Angles'
              )}
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

export default function NewArticlePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </AppShell>
      }
    >
      <NewArticleContent />
    </Suspense>
  );
}
