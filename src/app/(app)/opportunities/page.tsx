'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Trash2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface KeywordOpportunity {
  keyword: string;
  volume: number;
  kd: number;
  traffic_potential: number;
}

interface DiscoveryResult {
  striking_distance: KeywordOpportunity[];
  competitor_gaps: KeywordOpportunity[];
  unowned: KeywordOpportunity[];
  competitors_checked: number;
}

interface SavedOpportunity {
  id: string;
  keyword: string;
  volume: number | null;
  kd: number | null;
  traffic_potential: number | null;
  opportunity_type: string;
  status: 'new' | 'briefed' | 'written' | 'published';
  created_at: string;
}

type Tab = 'striking_distance' | 'competitor_gaps' | 'unowned';

const TAB_LABELS: Record<Tab, string> = {
  striking_distance: 'Striking distance',
  competitor_gaps: 'Competitor gaps',
  unowned: 'Unowned topics',
};

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  striking_distance: 'You rank 6–20 for these — a small push could get them to page 1.',
  competitor_gaps: 'Competitors rank for these but you don\'t — gaps worth closing.',
  unowned: 'Topically relevant keywords with no clear dominant ranker yet.',
};

const STATUS_LABELS: Record<SavedOpportunity['status'], string> = {
  new: 'New',
  briefed: 'Briefed',
  written: 'Written',
  published: 'Published',
};

const STATUS_STYLES: Record<SavedOpportunity['status'], string> = {
  new: 'bg-gray-100 text-gray-700',
  briefed: 'bg-amber-50 text-amber-700',
  written: 'bg-blue-50 text-blue-700',
  published: 'bg-green-50 text-green-700',
};

function kdBadgeStyle(kd: number): string {
  if (kd <= 30) return 'bg-green-100 text-green-700';
  if (kd <= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(v);
}

export default function OpportunitiesPage() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [results, setResults] = useState<DiscoveryResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('striking_distance');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedOpportunity[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem('activeBrandId');
    if (!id) { router.push('/dashboard'); return; }
    setBrandId(id);
  }, [router]);

  const loadSaved = useCallback(async (id: string) => {
    setLoadingSaved(true);
    const res = await fetch(`/api/opportunities?brand_id=${id}`);
    if (res.ok) {
      const data = await res.json();
      setSaved(data.opportunities ?? []);
    }
    setLoadingSaved(false);
  }, []);

  useEffect(() => {
    if (brandId) loadSaved(brandId);
  }, [brandId, loadSaved]);

  async function handleDiscover() {
    if (!brandId) return;
    setDiscovering(true);
    setResults(null);
    setSelected(new Set());

    try {
      const res = await fetch('/api/opportunities/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      setResults(data);

      const firstNonEmpty = (['striking_distance', 'competitor_gaps', 'unowned'] as Tab[]).find(
        (t) => data[t]?.length > 0
      );
      if (firstNonEmpty) setActiveTab(firstNonEmpty);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  }

  async function handleSave() {
    if (!brandId || selected.size === 0) return;
    setSaving(true);
    try {
      const savedKeywords = new Set(saved.map((s) => s.keyword.toLowerCase()));

      const items = Array.from(selected)
        .map((key) => {
          const [type, keyword] = key.split('::');
          if (savedKeywords.has(keyword.toLowerCase())) return null;
          const arr =
            type === 'striking_distance'
              ? results?.striking_distance
              : type === 'competitor_gaps'
              ? results?.competitor_gaps
              : results?.unowned;
          const kw = arr?.find((k) => k.keyword === keyword);
          if (!kw) return null;
          return { ...kw, opportunity_type: type };
        })
        .filter(Boolean);

      if (items.length === 0) {
        toast.error('All selected keywords are already saved.');
        return;
      }

      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      toast.success(
        data.saved === 1
          ? '1 keyword saved.'
          : `${data.saved} keywords saved.`
      );
      if (data.skipped > 0)
        toast(`${data.skipped} already saved — skipped.`, { icon: 'ℹ️' });

      setSelected(new Set());
      await loadSaved(brandId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch('/api/opportunities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      setSaved((prev) => prev.filter((s) => s.id !== id));
      toast.success('Removed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  function toggleSelect(type: Tab, keyword: string) {
    const key = `${type}::${keyword}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll(type: Tab, keywords: KeywordOpportunity[]) {
    const keys = keywords.map((k) => `${type}::${k.keyword}`);
    const allSelected = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  }

  const savedKeywords = new Set(saved.map((s) => s.keyword.toLowerCase()));

  function getTabItems(tab: Tab): KeywordOpportunity[] {
    if (!results) return [];
    const raw = results[tab];
    return raw.filter((k) => !savedKeywords.has(k.keyword.toLowerCase()));
  }

  const currentItems = getTabItems(activeTab);
  const tabKeys = currentItems.map((k) => `${activeTab}::${k.keyword}`);
  const allCurrentSelected = tabKeys.length > 0 && tabKeys.every((k) => selected.has(k));

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold text-text">
              Keyword Opportunities
            </h1>
            <p className="text-text-muted mt-1">
              Surface keywords worth writing about, ranked by potential.
            </p>
          </div>
          <Button onClick={handleDiscover} disabled={discovering}>
            {discovering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysing…
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find opportunities
              </>
            )}
          </Button>
        </div>

        {/* Discovery results */}
        {discovering && (
          <Card className="text-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
            <p className="text-text-muted text-sm">
              Querying DataForSEO — this takes 10–30 seconds…
            </p>
          </Card>
        )}

        {results && !discovering && (
          <Card className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-border pb-3 overflow-x-auto">
              {(['striking_distance', 'competitor_gaps', 'unowned'] as Tab[]).map((tab) => {
                const count = getTabItems(tab).length;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                      isActive
                        ? 'bg-accent-light text-accent-dark'
                        : 'text-text-muted hover:text-text hover:bg-surface-alt'
                    }`}
                  >
                    {TAB_LABELS[tab]}
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-surface-alt text-text-muted">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-sm text-text-muted">{TAB_DESCRIPTIONS[activeTab]}</p>

            {currentItems.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center">
                {activeTab === 'competitor_gaps' && results.competitors_checked === 0
                  ? 'Add competitor URLs on the Site Profile page to see competitor gap keywords.'
                  : 'No new keywords found for this category.'}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 w-8">
                          <input
                            type="checkbox"
                            checked={allCurrentSelected}
                            onChange={() => toggleAll(activeTab, currentItems)}
                            className="rounded accent-[var(--color-accent)]"
                          />
                        </th>
                        <th className="pb-2 font-medium text-text-muted">Keyword</th>
                        <th className="pb-2 font-medium text-text-muted text-right pr-4">Volume</th>
                        <th className="pb-2 font-medium text-text-muted text-right pr-4">KD</th>
                        <th className="pb-2 font-medium text-text-muted text-right">Potential</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((kw) => {
                        const key = `${activeTab}::${kw.keyword}`;
                        const isSelected = selected.has(key);
                        return (
                          <tr
                            key={kw.keyword}
                            className={`border-b border-border last:border-0 transition-colors cursor-pointer ${
                              isSelected ? 'bg-accent-light/40' : 'hover:bg-surface-alt'
                            }`}
                            onClick={() => toggleSelect(activeTab, kw.keyword)}
                          >
                            <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(activeTab, kw.keyword)}
                                className="rounded accent-[var(--color-accent)]"
                              />
                            </td>
                            <td className="py-2.5 font-medium text-text">{kw.keyword}</td>
                            <td className="py-2.5 text-right pr-4 text-text-muted">
                              {formatVolume(kw.volume)}
                            </td>
                            <td className="py-2.5 text-right pr-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${kdBadgeStyle(kw.kd)}`}
                              >
                                {kw.kd}
                              </span>
                            </td>
                            <td className="py-2.5 text-right text-text-muted">
                              ~{formatVolume(kw.traffic_potential)}/mo
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-text-muted">
                    {selected.size > 0
                      ? `${selected.size} keyword${selected.size !== 1 ? 's' : ''} selected`
                      : 'Select keywords to save them'}
                  </p>
                  <Button
                    onClick={handleSave}
                    disabled={selected.size === 0 || saving}
                    className="px-5 py-2.5 text-sm"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Save {selected.size > 0 ? selected.size : ''} selected
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Saved opportunities */}
        <div>
          <h2 className="font-display text-xl font-semibold text-text mb-3">
            Saved opportunities
          </h2>

          {loadingSaved ? (
            <Card className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </Card>
          ) : saved.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-text-muted text-sm">
                No opportunities saved yet. Run a discovery and select keywords to save.
              </p>
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 font-medium text-text-muted">Keyword</th>
                    <th className="px-3 py-3 font-medium text-text-muted">Type</th>
                    <th className="px-3 py-3 font-medium text-text-muted text-right">Vol</th>
                    <th className="px-3 py-3 font-medium text-text-muted text-right">KD</th>
                    <th className="px-3 py-3 font-medium text-text-muted">Status</th>
                    <th className="px-6 py-3 font-medium text-text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((opp) => (
                    <tr
                      key={opp.id}
                      className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors"
                    >
                      <td className="px-6 py-3 font-medium text-text">{opp.keyword}</td>
                      <td className="px-3 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-surface-alt text-text-muted capitalize">
                          {opp.opportunity_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-text-muted">
                        {opp.volume != null ? formatVolume(opp.volume) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {opp.kd != null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${kdBadgeStyle(opp.kd)}`}
                          >
                            {opp.kd}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={STATUS_STYLES[opp.status]}>
                          {STATUS_LABELS[opp.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDelete(opp.id)}
                            disabled={deleting === opp.id}
                            className="text-text-muted hover:text-destructive transition-colors duration-200 disabled:opacity-50"
                            aria-label="Delete"
                          >
                            {deleting === opp.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
