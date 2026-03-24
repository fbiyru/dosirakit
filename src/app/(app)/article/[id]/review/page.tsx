'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/ui/tag-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Archive, Send, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface ArticleContent {
  id: string;
  title: string;
  slug: string;
  body: string;
  meta_title: string;
  meta_description: string;
  category: string;
  tags: string[];
  image_prompt: string;
  word_count: number;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-text-muted hover:text-accent transition-colors p-1"
      title="Copy"
    >
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const articleId = params.id as string;

  const [content, setContent] = useState<ArticleContent | null>(null);
  const [articleStatus, setArticleStatus] = useState<string>('draft');
  const [wpUrl, setWpUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: articleData } = await supabase
        .from('articles')
        .select('status, wp_post_url')
        .eq('id', articleId)
        .single();

      if (articleData) {
        setArticleStatus(articleData.status);
        setWpUrl(articleData.wp_post_url);
      }

      const { data } = await supabase
        .from('article_content')
        .select('*')
        .eq('article_id', articleId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setContent({
          id: data.id,
          title: data.title ?? '',
          slug: data.slug ?? '',
          body: data.body ?? '',
          meta_title: data.meta_title ?? '',
          meta_description: data.meta_description ?? '',
          category: data.category ?? '',
          tags: data.tags ?? [],
          image_prompt: data.image_prompt ?? '',
          word_count: data.word_count ?? 0,
        });
      }
      setLoading(false);
    }
    load();
  }, [articleId]);

  const autoSave = useCallback(
    (updated: Partial<ArticleContent>) => {
      if (!content) return;

      const newContent = { ...content, ...updated };
      setContent(newContent);

      // Recalculate word count if body changed
      if (updated.body !== undefined) {
        newContent.word_count = updated.body.split(/\s+/).filter(Boolean).length;
      }

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        const supabase = createClient();
        await supabase
          .from('article_content')
          .update({
            title: newContent.title,
            slug: newContent.slug,
            body: newContent.body,
            meta_title: newContent.meta_title,
            meta_description: newContent.meta_description,
            category: newContent.category,
            tags: newContent.tags,
            image_prompt: newContent.image_prompt,
            word_count: newContent.word_count,
            updated_at: new Date().toISOString(),
          })
          .eq('id', content.id);
      }, 2000);
    },
    [content]
  );

  async function handleArchive() {
    setArchiving(true);
    const supabase = createClient();
    await supabase
      .from('articles')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', articleId);

    setArticleStatus('archived');
    toast.success('Article archived!');
    setArchiving(false);
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish');
      }

      const data = await res.json();
      setWpUrl(data.post_url);
      setArticleStatus('published');
      toast.success('Published to WordPress as draft!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  if (loading || !content) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left panel — Article body */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <input
                type="text"
                value={content.title}
                onChange={(e) => autoSave({ title: e.target.value })}
                className="w-full font-display text-3xl font-bold text-text bg-transparent border-none outline-none placeholder:text-text-muted"
                placeholder="Article title"
              />
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="accent">{content.word_count} words</Badge>
                <Badge variant={articleStatus === 'published' ? 'published' : articleStatus === 'archived' ? 'archived' : 'draft'}>
                  {articleStatus}
                </Badge>
              </div>
            </div>

            <div data-color-mode="light">
              <MDEditor
                value={content.body}
                onChange={(val) => autoSave({ body: val ?? '' })}
                height={600}
                preview="edit"
              />
            </div>
          </div>

          {/* Right panel — Metadata */}
          <div className="w-full md:w-80 space-y-4 md:sticky md:top-6 md:self-start">
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-display text-lg font-semibold text-text">Metadata</h3>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text">SEO Title</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-muted">{content.meta_title.length}/60</span>
                    <CopyButton value={content.meta_title} />
                  </div>
                </div>
                <Input
                  value={content.meta_title}
                  onChange={(e) => autoSave({ meta_title: e.target.value })}
                  maxLength={60}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text">Meta Description</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-muted">{content.meta_description.length}/155</span>
                    <CopyButton value={content.meta_description} />
                  </div>
                </div>
                <Textarea
                  value={content.meta_description}
                  onChange={(e) => autoSave({ meta_description: e.target.value })}
                  className="min-h-[60px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text">URL Slug</label>
                  <CopyButton value={content.slug} />
                </div>
                <Input
                  value={content.slug}
                  onChange={(e) => autoSave({ slug: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text">Category</label>
                  <CopyButton value={content.category} />
                </div>
                <Input
                  value={content.category}
                  onChange={(e) => autoSave({ category: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text">Tags</label>
                  <CopyButton value={content.tags.join(', ')} />
                </div>
                <TagInput
                  value={content.tags}
                  onChange={(tags) => autoSave({ tags })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text">AI Image Prompt</label>
                  <CopyButton value={content.image_prompt} />
                </div>
                <Textarea
                  value={content.image_prompt}
                  onChange={(e) => autoSave({ image_prompt: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {/* WP link */}
            {wpUrl && (
              <a
                href={wpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-accent hover:text-accent-dark transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on WordPress
              </a>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="sticky bottom-0 bg-bg border-t border-border py-4 mt-8 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={handleArchive}
            disabled={archiving}
          >
            <Archive className="w-4 h-4" />
            {archiving ? 'Archiving...' : 'Archive Article'}
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Publish to WordPress + Archive
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
