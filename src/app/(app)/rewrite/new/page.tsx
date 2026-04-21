'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Globe,
  FileText,
  Upload,
  Archive,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Source = 'archive' | 'url' | 'gdocs' | 'file';

interface ArchiveArticle {
  id: string;
  focus_keyword: string;
  article_content: { title: string | null }[] | null;
}

const STEPS = ['Source', 'Preview', 'Keyword'];

function RewriteNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedArchiveId = searchParams.get('archive_id');

  const [brandId, setBrandId] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  // Step 1: source
  const [source, setSource] = useState<Source>(
    preselectedArchiveId ? 'archive' : 'url'
  );
  const [urlInput, setUrlInput] = useState('');
  const [gdocsInput, setGdocsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [archiveArticles, setArchiveArticles] = useState<ArchiveArticle[]>([]);
  const [selectedArchiveId, setSelectedArchiveId] = useState(
    preselectedArchiveId || ''
  );
  const [extracting, setExtracting] = useState(false);

  // Step 2: preview
  const [content, setContent] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');

  // Step 3: keyword + notes
  const [keyword, setKeyword] = useState('');
  const [notes, setNotes] = useState('');
  const [runSerp, setRunSerp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('activeBrandId');
    if (!id) {
      router.push('/dashboard');
      return;
    }
    setBrandId(id);
  }, [router]);

  useEffect(() => {
    if (!brandId) return;
    const supabase = createClient();
    supabase
      .from('articles')
      .select('id, focus_keyword, article_content(title)')
      .eq('brand_id', brandId)
      .not('article_content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setArchiveArticles(data as ArchiveArticle[]);
      });
  }, [brandId]);

  // If preselected, auto-extract on load
  useEffect(() => {
    if (preselectedArchiveId && brandId && step === 0) {
      handleExtract();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedArchiveId, brandId]);

  async function handleExtract() {
    if (!brandId) return;
    setExtracting(true);

    try {
      let res: Response;

      if (source === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch('/api/rewrite/extract', {
          method: 'POST',
          body: formData,
        });
      } else {
        const value =
          source === 'archive'
            ? selectedArchiveId
            : source === 'url'
            ? urlInput
            : gdocsInput;

        if (!value) {
          toast.error('Please provide the content source.');
          setExtracting(false);
          return;
        }

        res = await fetch('/api/rewrite/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, value, brand_id: brandId }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      setContent(data.content);
      setSourceLabel(data.source_label || '');
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit() {
    if (!brandId || !keyword.trim() || !content) return;
    setSubmitting(true);

    try {
      const rewriteSource =
        source === 'archive'
          ? selectedArchiveId
          : source === 'url'
          ? urlInput
          : source === 'gdocs'
          ? gdocsInput
          : file?.name || 'uploaded file';

      // Phase 1: create article record
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          content,
          keyword: keyword.trim(),
          notes: notes.trim() || null,
          rewrite_source: rewriteSource,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rewrite failed');

      // Phase 2: redirect to processing page which streams the rewrite
      const params = new URLSearchParams();
      if (!runSerp) params.set('skip_serp', '1');
      const qs = params.toString();
      router.push(
        `/rewrite/${data.article_id}/processing${qs ? `?${qs}` : ''}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rewrite failed');
      setSubmitting(false);
    }
  }

  const sourceOptions: { key: Source; label: string; icon: typeof Globe }[] = [
    { key: 'url', label: 'From URL', icon: Globe },
    { key: 'gdocs', label: 'Google Docs', icon: FileText },
    { key: 'file', label: 'Upload file', icon: Upload },
    { key: 'archive', label: 'From archive', icon: Archive },
  ];

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : router.push('/dashboard'))}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 0 ? 'Back' : 'Dashboard'}
          </button>
          <h1 className="font-display text-3xl font-bold text-text">
            Rewrite an article
          </h1>
          <p className="text-text-muted mt-1">
            Provide existing content, pick a keyword, and let Claude rewrite it to
            match your brand voice and outrank the competition.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center ${
                  i < step
                    ? 'bg-success text-white'
                    : i === step
                    ? 'bg-accent text-white'
                    : 'bg-surface-alt text-text-muted border border-border'
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={`text-sm ${
                  i === step ? 'text-text font-medium' : 'text-text-muted'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Choose source */}
        {step === 0 && (
          <Card className="space-y-5">
            <p className="text-sm font-medium text-text">
              Where is the article?
            </p>

            <div className="grid grid-cols-2 gap-3">
              {sourceOptions.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                    source === key
                      ? 'border-accent bg-accent-light text-accent-dark'
                      : 'border-border hover:bg-surface-alt text-text'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            {/* Source-specific input */}
            {source === 'url' && (
              <div>
                <label className="text-sm text-text-muted block mb-1.5">
                  Article URL
                </label>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                />
              </div>
            )}

            {source === 'gdocs' && (
              <div>
                <label className="text-sm text-text-muted block mb-1.5">
                  Google Docs URL
                </label>
                <Input
                  value={gdocsInput}
                  onChange={(e) => setGdocsInput(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                />
                <p className="text-xs text-text-muted mt-1.5">
                  The document must be set to &quot;Anyone with the link can
                  view&quot;.
                </p>
              </div>
            )}

            {source === 'file' && (
              <div>
                <label className="text-sm text-text-muted block mb-1.5">
                  Upload .txt, .docx, or .pdf (max 10 MB)
                </label>
                <input
                  type="file"
                  accept=".txt,.docx,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-sm text-text file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:text-sm file:font-medium file:bg-surface-alt file:text-text hover:file:bg-accent-light file:transition-colors file:cursor-pointer"
                />
                <p className="text-xs text-text-muted mt-1.5">
                  Text-based PDFs only. Scanned or image-based PDFs won&apos;t
                  work.
                </p>
              </div>
            )}

            {source === 'archive' && (
              <div>
                <label className="text-sm text-text-muted block mb-1.5">
                  Select an article
                </label>
                <select
                  value={selectedArchiveId}
                  onChange={(e) => setSelectedArchiveId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">Choose an article…</option>
                  {archiveArticles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.article_content?.[0]?.title || a.focus_keyword}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleExtract} disabled={extracting}>
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  <>
                    Extract content
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 1: Preview extracted content */}
        {step === 1 && (
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text">
                Extracted content
              </p>
              {sourceLabel && (
                <span className="text-xs text-text-muted">{sourceLabel}</span>
              )}
            </div>

            <div className="border border-border rounded-xl p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-text whitespace-pre-wrap font-sans leading-relaxed">
                {content}
              </pre>
            </div>

            <p className="text-xs text-text-muted">
              {content.split(/\s+/).filter(Boolean).length} words extracted.
              Review the content above. If it looks correct, proceed to set your
              keyword.
            </p>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(0)}>
                <ArrowLeft className="w-4 h-4" />
                Change source
              </Button>
              <Button onClick={() => setStep(2)}>
                Looks good
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Keyword + notes */}
        {step === 2 && (
          <Card className="space-y-5">
            <div>
              <label className="text-sm font-medium text-text block mb-1.5">
                Primary keyword to rank for
              </label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. tteokbokki recipe, how to make kimchi"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text block mb-1.5">
                Notes for the AI (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Focus on beginner-friendly language. Keep the recipe intact but restructure the intro."
                className="min-h-[80px]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={runSerp}
                onChange={(e) => setRunSerp(e.target.checked)}
                className="rounded accent-[var(--color-accent)]"
              />
              <span className="text-sm text-text">
                Run SERP analysis (analyse top-ranking pages for this keyword)
              </span>
            </label>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!keyword.trim() || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting rewrite…
                  </>
                ) : (
                  <>
                    Rewrite article
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export default function RewriteNewPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </AppShell>
      }
    >
      <RewriteNewInner />
    </Suspense>
  );
}
