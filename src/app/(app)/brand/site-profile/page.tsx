'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Globe, RefreshCw, Trash2, Plus, Link2, Mic, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface SiteProfile {
  id: string;
  brand_id: string;
  site_url: string;
  url_map: string[] | null;
  site_summary: string | null;
  last_scraped_at: string;
}

interface Competitor {
  id: string;
  brand_id: string;
  name: string | null;
  url: string;
}

export default function SiteProfilePage() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandSiteUrl, setBrandSiteUrl] = useState('');
  const [profile, setProfile] = useState<SiteProfile | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [newCompetitorUrl, setNewCompetitorUrl] = useState('');
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [addingCompetitor, setAddingCompetitor] = useState(false);
  const [currentVoice, setCurrentVoice] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const id = localStorage.getItem('activeBrandId');
      if (!id) {
        router.push('/dashboard');
        return;
      }
      setBrandId(id);

      const supabase = createClient();
      const { data: brand } = await supabase
        .from('brands')
        .select('name')
        .eq('id', id)
        .single();
      if (brand) setBrandName(brand.name);

      const { data: settings } = await supabase
        .from('brand_settings')
        .select('site_url, tone_and_voice')
        .eq('brand_id', id)
        .single();
      if (settings?.site_url) setBrandSiteUrl(settings.site_url);
      if (settings?.tone_and_voice) setCurrentVoice(settings.tone_and_voice);

      await refresh(id);
      setLoading(false);
    }
    load();
  }, [router]);

  async function refresh(id: string) {
    const res = await fetch(`/api/site-profile?brand_id=${id}`);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setCompetitors(data.competitors);
    }
  }

  async function runScrape() {
    if (!brandId || !brandSiteUrl) {
      toast.error('Enter your site URL in brand settings first.');
      return;
    }
    setScraping(true);
    try {
      const res = await fetch('/api/site-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId, site_url: brandSiteUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Scrape failed');
      }
      const data = await res.json();
      toast.success(
        `Mapped ${data.mapped_count} URLs and scraped ${data.scraped_pages.length} pages.`
      );
      await refresh(brandId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scrape failed';
      toast.error(msg);
    } finally {
      setScraping(false);
    }
  }

  async function addCompetitor() {
    if (!brandId || !newCompetitorUrl.trim()) return;
    if (competitors.length >= 3) {
      toast.error('Maximum 3 competitors.');
      return;
    }
    setAddingCompetitor(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          url: newCompetitorUrl.trim(),
          name: newCompetitorName.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add competitor');
      }
      setNewCompetitorUrl('');
      setNewCompetitorName('');
      await refresh(brandId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add competitor';
      toast.error(msg);
    } finally {
      setAddingCompetitor(false);
    }
  }

  async function removeCompetitor(id: string) {
    if (!brandId) return;
    try {
      const res = await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove');
      }
      await refresh(brandId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove';
      toast.error(msg);
    }
  }

  async function extractVoice() {
    if (!brandId) return;
    if (!profile?.site_summary) {
      toast.error('Run the site profile scrape first.');
      return;
    }
    setExtracting(true);
    try {
      const res = await fetch('/api/brand-voice/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Extraction failed');
      }
      const data = await res.json();
      setPreviewMarkdown(data.markdown);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extraction failed';
      toast.error(msg);
    } finally {
      setExtracting(false);
    }
  }

  async function applyVoice(mode: 'replace' | 'append') {
    if (!brandId || !previewMarkdown) return;
    setApplying(true);
    try {
      const merged =
        mode === 'append' && currentVoice
          ? `${currentVoice.trim()}\n\n---\n\n${previewMarkdown}`
          : previewMarkdown;

      const supabase = createClient();
      const { error } = await supabase
        .from('brand_settings')
        .update({ tone_and_voice: merged })
        .eq('brand_id', brandId);
      if (error) throw error;
      setCurrentVoice(merged);
      setPreviewMarkdown(null);
      toast.success(
        mode === 'append' ? 'Appended to brand voice.' : 'Brand voice replaced.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      </AppShell>
    );
  }

  const urlCount = profile?.url_map?.length ?? 0;
  const summaryPreview = profile?.site_summary?.slice(0, 500) || '';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-text">Site profile</h1>
          <p className="text-text-muted mt-1">
            A map of <span className="font-medium text-text">{brandName}</span>&apos;s
            existing content and your competitor set. Used by the opportunities and brief
            stages.
          </p>
        </div>

        {/* Site profile card */}
        <Card>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center">
                <Globe className="w-5 h-5 text-accent-dark" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-text">
                  Your site
                </h2>
                <p className="text-sm text-text-muted">{brandSiteUrl || 'No URL set'}</p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={runScrape}
              disabled={scraping || !brandSiteUrl}
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scraping…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {profile ? 'Update site profile' : 'Run first scrape'}
                </>
              )}
            </Button>
          </div>

          {profile ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <Stat label="URLs mapped" value={urlCount.toString()} />
              <Stat
                label="Summary length"
                value={`${Math.round(
                  (profile.site_summary?.length || 0) / 1000
                ).toLocaleString()}k chars`}
              />
              <Stat
                label="Last scraped"
                value={new Date(profile.last_scraped_at).toLocaleString()}
              />
            </div>
          ) : (
            <p className="text-sm text-text-muted bg-surface-alt rounded-xl p-4">
              No site profile yet. Click <span className="font-medium">Run first scrape</span>{' '}
              to map your site and pull a summary of your existing content.
            </p>
          )}

          {summaryPreview && (
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                Summary preview
              </p>
              <div className="bg-surface-alt rounded-xl p-4 text-sm text-text-muted font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                {summaryPreview}
                {profile && (profile.site_summary?.length || 0) > summaryPreview.length
                  ? '…'
                  : ''}
              </div>
            </div>
          )}
        </Card>

        {/* Brand voice card */}
        <Card>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center">
                <Mic className="w-5 h-5 text-accent-dark" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-text">
                  Brand voice
                </h2>
                <p className="text-sm text-text-muted">
                  Extract your voice profile from the scraped site content.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={extractVoice}
              disabled={extracting || !profile?.site_summary}
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {currentVoice ? 'Re-extract voice' : 'Extract voice'}
                </>
              )}
            </Button>
          </div>

          {currentVoice ? (
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                Current brand voice
              </p>
              <div className="bg-surface-alt rounded-xl p-4 text-sm text-text whitespace-pre-wrap max-h-64 overflow-y-auto">
                {currentVoice}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted bg-surface-alt rounded-xl p-4">
              {profile?.site_summary
                ? 'No voice profile yet. Click Extract voice to generate one from your scraped site content.'
                : 'Run the site profile scrape first, then come back to extract your brand voice.'}
            </p>
          )}
        </Card>

        {/* Competitors card */}
        <Card>
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold text-text">
              Competitors
            </h2>
            <p className="text-sm text-text-muted">
              2–3 competitor URLs. Used in the keyword opportunity stage to find gaps.
            </p>
          </div>

          {competitors.length > 0 ? (
            <div className="space-y-2 mb-4">
              {competitors.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-surface-alt rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Link2 className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <div className="min-w-0">
                      {c.name && (
                        <p className="font-medium text-text truncate">{c.name}</p>
                      )}
                      <p className="text-sm text-text-muted truncate">{c.url}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCompetitor(c.id)}
                    className="p-2 rounded-lg text-text-muted hover:text-destructive hover:bg-white transition-colors"
                    title="Remove competitor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted bg-surface-alt rounded-xl p-4 mb-4">
              No competitors added yet.
            </p>
          )}

          {competitors.length < 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Name (optional)"
                value={newCompetitorName}
                onChange={(e) => setNewCompetitorName(e.target.value)}
              />
              <div className="md:col-span-2 flex gap-2">
                <Input
                  placeholder="https://competitor.com"
                  value={newCompetitorUrl}
                  onChange={(e) => setNewCompetitorUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCompetitor();
                  }}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={addCompetitor}
                  disabled={addingCompetitor || !newCompetitorUrl.trim()}
                >
                  {addingCompetitor ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Voice preview modal */}
      {previewMarkdown && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => !applying && setPreviewMarkdown(null)}
        >
          <div
            className="bg-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
              <div>
                <h3 className="font-display text-xl font-semibold text-text">
                  Extracted brand voice
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  {currentVoice
                    ? 'Choose how to apply this to your existing brand voice.'
                    : 'Review the extracted profile and apply it to your brand.'}
                </p>
              </div>
              <button
                onClick={() => !applying && setPreviewMarkdown(null)}
                className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
                disabled={applying}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-surface-alt rounded-xl p-4 text-sm text-text whitespace-pre-wrap">
                {previewMarkdown}
              </div>
            </div>
            <div className="p-6 border-t border-border flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setPreviewMarkdown(null)}
                disabled={applying}
              >
                Cancel
              </Button>
              {currentVoice && (
                <Button
                  variant="secondary"
                  onClick={() => applyVoice('append')}
                  disabled={applying}
                  title="Keep existing voice and add the extracted one below it"
                >
                  {applying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add to existing voice
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => applyVoice('replace')}
                disabled={applying}
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {currentVoice ? 'Replace voice' : 'Apply voice'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-alt rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
        {label}
      </p>
      <p className="font-display text-lg font-semibold text-text mt-1 truncate">
        {value}
      </p>
    </div>
  );
}
