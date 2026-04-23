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
import { Copy, Check, Archive, Send, Loader2, ExternalLink, X, Plug, Image, Camera, Share2, RefreshCw, FileText } from 'lucide-react';
import Link from 'next/link';
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
  image_prompt_pinterest: string;
  image_prompt_social: string;
  image_filename: string;
  image_alt_text: string;
  image_meta_description: string;
  image_pinterest_filename: string;
  image_pinterest_alt_text: string;
  image_pinterest_meta_description: string;
  image_social_filename: string;
  image_social_alt_text: string;
  image_social_meta_description: string;
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
  const [wpConfigured, setWpConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showWpModal, setShowWpModal] = useState(false);
  const [wpForm, setWpForm] = useState({ site_url: '', username: '', app_password: '' });
  const [testingWp, setTestingWp] = useState(false);
  const [savingWp, setSavingWp] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const activeBrandId = localStorage.getItem('activeBrandId');
      setBrandId(activeBrandId);

      const { data: articleData } = await supabase
        .from('articles')
        .select('status, wp_post_url')
        .eq('id', articleId)
        .single();

      if (articleData) {
        setArticleStatus(articleData.status);
        setWpUrl(articleData.wp_post_url);
      }

      // Check WordPress configuration
      if (activeBrandId) {
        const { data: settings } = await supabase
          .from('brand_settings')
          .select('wp_site_url, wp_username, wp_app_password')
          .eq('brand_id', activeBrandId)
          .single();

        if (settings?.wp_site_url && settings?.wp_username && settings?.wp_app_password) {
          setWpConfigured(true);
          setWpForm({
            site_url: settings.wp_site_url,
            username: settings.wp_username,
            app_password: settings.wp_app_password,
          });
        }
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
          image_prompt_pinterest: data.image_prompt_pinterest ?? '',
          image_prompt_social: data.image_prompt_social ?? '',
          image_filename: data.image_filename ?? '',
          image_alt_text: data.image_alt_text ?? '',
          image_meta_description: data.image_meta_description ?? '',
          image_pinterest_filename: data.image_pinterest_filename ?? '',
          image_pinterest_alt_text: data.image_pinterest_alt_text ?? '',
          image_pinterest_meta_description: data.image_pinterest_meta_description ?? '',
          image_social_filename: data.image_social_filename ?? '',
          image_social_alt_text: data.image_social_alt_text ?? '',
          image_social_meta_description: data.image_social_meta_description ?? '',
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
            image_prompt_pinterest: newContent.image_prompt_pinterest,
            image_prompt_social: newContent.image_prompt_social,
            image_filename: newContent.image_filename,
            image_alt_text: newContent.image_alt_text,
            image_meta_description: newContent.image_meta_description,
            image_pinterest_filename: newContent.image_pinterest_filename,
            image_pinterest_alt_text: newContent.image_pinterest_alt_text,
            image_pinterest_meta_description: newContent.image_pinterest_meta_description,
            image_social_filename: newContent.image_social_filename,
            image_social_alt_text: newContent.image_social_alt_text,
            image_social_meta_description: newContent.image_social_meta_description,
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

  async function handleTestWpConnection() {
    setTestingWp(true);
    try {
      const { site_url, username, app_password } = wpForm;
      if (!site_url || !username || !app_password) {
        toast.error('All fields are required');
        setTestingWp(false);
        return;
      }

      const cleanUrl = site_url.replace(/\/+$/, '');
      const credentials = btoa(`${username}:${app_password.replace(/\s/g, '')}`);

      const res = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: `Basic ${credentials}` },
      });

      if (!res.ok) {
        throw new Error('Connection failed. Check your credentials.');
      }

      toast.success('Connection successful!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setTestingWp(false);
    }
  }

  async function handleSaveWpConnection() {
    if (!brandId) return;
    setSavingWp(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('brand_settings')
        .update({
          wp_site_url: wpForm.site_url.replace(/\/+$/, ''),
          wp_username: wpForm.username,
          wp_app_password: wpForm.app_password,
          updated_at: new Date().toISOString(),
        })
        .eq('brand_id', brandId);

      if (error) throw error;

      setWpConfigured(true);
      setShowWpModal(false);
      toast.success('WordPress connection saved!');
    } catch {
      toast.error('Failed to save WordPress connection');
    } finally {
      setSavingWp(false);
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
            </div>

            {/* Image Prompts & Metadata — only show if at least one prompt exists */}
            {(content.image_prompt || content.image_prompt_pinterest || content.image_prompt_social) && (
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
              <h3 className="font-display text-lg font-semibold text-text">Image Prompts & SEO</h3>

              {/* Blog featured image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-accent" />
                    Blog featured image
                  </label>
                  <CopyButton value={content.image_prompt} />
                </div>
                <Textarea
                  value={content.image_prompt}
                  onChange={(e) => autoSave({ image_prompt: e.target.value })}
                  className="min-h-[80px] text-sm"
                  placeholder="AI image prompt for the blog featured image..."
                />
                {(content.image_filename || content.image_alt_text || content.image_meta_description) && (
                  <div className="bg-surface-alt rounded-xl p-3 space-y-2">
                    <p className="text-xs font-medium text-text-muted flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Image SEO metadata
                    </p>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Filename</label>
                        <CopyButton value={content.image_filename} />
                      </div>
                      <Input
                        value={content.image_filename}
                        onChange={(e) => autoSave({ image_filename: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Alt text</label>
                        <CopyButton value={content.image_alt_text} />
                      </div>
                      <Input
                        value={content.image_alt_text}
                        onChange={(e) => autoSave({ image_alt_text: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Meta description</label>
                        <CopyButton value={content.image_meta_description} />
                      </div>
                      <Input
                        value={content.image_meta_description}
                        onChange={(e) => autoSave({ image_meta_description: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pinterest */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-red-500" />
                    Pinterest
                  </label>
                  <CopyButton value={content.image_prompt_pinterest} />
                </div>
                <Textarea
                  value={content.image_prompt_pinterest}
                  onChange={(e) => autoSave({ image_prompt_pinterest: e.target.value })}
                  className="min-h-[80px] text-sm"
                  placeholder="AI image prompt optimised for Pinterest (portrait 2:3)..."
                />
                {(content.image_pinterest_filename || content.image_pinterest_alt_text || content.image_pinterest_meta_description) && (
                  <div className="bg-surface-alt rounded-xl p-3 space-y-2">
                    <p className="text-xs font-medium text-text-muted flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Image SEO metadata
                    </p>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Filename</label>
                        <CopyButton value={content.image_pinterest_filename} />
                      </div>
                      <Input
                        value={content.image_pinterest_filename}
                        onChange={(e) => autoSave({ image_pinterest_filename: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Alt text</label>
                        <CopyButton value={content.image_pinterest_alt_text} />
                      </div>
                      <Input
                        value={content.image_pinterest_alt_text}
                        onChange={(e) => autoSave({ image_pinterest_alt_text: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Meta description</label>
                        <CopyButton value={content.image_pinterest_meta_description} />
                      </div>
                      <Input
                        value={content.image_pinterest_meta_description}
                        onChange={(e) => autoSave({ image_pinterest_meta_description: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Social */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-text flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-purple-500" />
                    Instagram / TikTok
                  </label>
                  <CopyButton value={content.image_prompt_social} />
                </div>
                <Textarea
                  value={content.image_prompt_social}
                  onChange={(e) => autoSave({ image_prompt_social: e.target.value })}
                  className="min-h-[80px] text-sm"
                  placeholder="AI image prompt for Instagram/TikTok (square or 4:5)..."
                />
                {(content.image_social_filename || content.image_social_alt_text || content.image_social_meta_description) && (
                  <div className="bg-surface-alt rounded-xl p-3 space-y-2">
                    <p className="text-xs font-medium text-text-muted flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Image SEO metadata
                    </p>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Filename</label>
                        <CopyButton value={content.image_social_filename} />
                      </div>
                      <Input
                        value={content.image_social_filename}
                        onChange={(e) => autoSave({ image_social_filename: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Alt text</label>
                        <CopyButton value={content.image_social_alt_text} />
                      </div>
                      <Input
                        value={content.image_social_alt_text}
                        onChange={(e) => autoSave({ image_social_alt_text: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted">Meta description</label>
                        <CopyButton value={content.image_social_meta_description} />
                      </div>
                      <Input
                        value={content.image_social_meta_description}
                        onChange={(e) => autoSave({ image_social_meta_description: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

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
          <Link href={`/rewrite/new?archive_id=${articleId}`}>
            <Button variant="secondary">
              <RefreshCw className="w-4 h-4" />
              Rewrite
            </Button>
          </Link>
          {wpConfigured ? (
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
          ) : (
            <Button variant="secondary" onClick={() => setShowWpModal(true)}>
              <Plug className="w-4 h-4" />
              Connect to WordPress
            </Button>
          )}
        </div>
      </div>

      {/* WordPress Connection Modal */}
      {showWpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-text">
                Connect to WordPress
              </h2>
              <button
                onClick={() => setShowWpModal(false)}
                className="text-text-muted hover:text-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text block mb-1">WordPress site URL</label>
                <Input
                  value={wpForm.site_url}
                  onChange={(e) => setWpForm((f) => ({ ...f, site_url: e.target.value }))}
                  placeholder="https://yourblog.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text block mb-1">WordPress username</label>
                <Input
                  value={wpForm.username}
                  onChange={(e) => setWpForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="admin"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text block mb-1">Application password</label>
                <Input
                  type="password"
                  value={wpForm.app_password}
                  onChange={(e) => setWpForm((f) => ({ ...f, app_password: e.target.value }))}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                />
                <p className="text-xs text-text-muted mt-1">
                  Create one in WordPress &rarr; Users &rarr; Profile &rarr; Application Passwords
                </p>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleTestWpConnection}
                  disabled={testingWp}
                >
                  {testingWp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={handleSaveWpConnection}
                  disabled={savingWp || !wpForm.site_url || !wpForm.username || !wpForm.app_password}
                >
                  {savingWp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Connection'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
