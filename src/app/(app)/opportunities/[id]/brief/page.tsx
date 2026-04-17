'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ArrowLeft,
  Pencil,
  Check,
  X as XIcon,
  Link2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OutlineSection {
  heading: string;
  subheadings?: string[];
  notes: string;
  word_allocation: number;
}

interface InternalLink {
  url: string;
  anchor_suggestion: string;
}

interface BriefContent {
  primary_keyword: string;
  long_tail_variants: string[];
  people_also_ask: string[];
  recommended_title: string;
  outline: OutlineSection[];
  target_word_count_min: number;
  target_word_count_max: number;
  semantic_keywords: string[];
  internal_links: InternalLink[];
  writing_notes: string;
}

interface Brief {
  id: string;
  opportunity_id: string;
  brand_id: string;
  brief_content: BriefContent;
  created_at: string;
}

export default function BriefPage() {
  const { id: opportunityId } = useParams<{ id: string }>();
  const router = useRouter();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBrief = useCallback(async () => {
    const res = await fetch(
      `/api/briefs?opportunity_id=${opportunityId}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.brief) {
        setBrief(data.brief);
        setLoading(false);
        return true;
      }
    }
    setLoading(false);
    return false;
  }, [opportunityId]);

  useEffect(() => {
    async function init() {
      const exists = await loadBrief();
      if (!exists) {
        setGenerating(true);
        try {
          const res = await fetch('/api/briefs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opportunity_id: opportunityId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Brief generation failed');
          setBrief(data.brief);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Failed to generate brief'
          );
        } finally {
          setGenerating(false);
        }
      }
    }
    init();
  }, [opportunityId, loadBrief]);

  async function saveBrief(content: BriefContent) {
    if (!brief) return;
    setSaving(true);
    try {
      const res = await fetch('/api/briefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: brief.id, brief_content: content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      toast.success('Brief saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function debouncedSave(content: BriefContent) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveBrief(content), 2000);
  }

  function updateContent<K extends keyof BriefContent>(
    key: K,
    value: BriefContent[K]
  ) {
    if (!brief) return;
    const updated = { ...brief.brief_content, [key]: value };
    setBrief({ ...brief, brief_content: updated });
    debouncedSave(updated);
  }

  function startEdit(field: string, currentValue: string) {
    setEditingField(field);
    setEditDraft(currentValue);
  }

  function cancelEdit() {
    setEditingField(null);
    setEditDraft('');
  }

  function commitEdit(field: string) {
    if (!brief) return;
    updateContent(field as keyof BriefContent, editDraft as never);
    setEditingField(null);
    setEditDraft('');
  }

  if (loading || generating) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-text-muted text-sm">
            {generating
              ? 'Claude is building your content brief…'
              : 'Loading brief…'}
          </p>
        </div>
      </AppShell>
    );
  }

  if (!brief) {
    return (
      <AppShell>
        <div className="p-6 md:p-8 max-w-4xl mx-auto text-center">
          <p className="text-text-muted mb-4">
            Failed to load or generate a brief for this opportunity.
          </p>
          <Button variant="secondary" onClick={() => router.push('/opportunities')}>
            <ArrowLeft className="w-4 h-4" />
            Back to opportunities
          </Button>
        </div>
      </AppShell>
    );
  }

  const bc = brief.brief_content;

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            onClick={() => router.push('/opportunities')}
            className="px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold text-text truncate">
              Brief: {bc.primary_keyword}
            </h1>
            <p className="text-text-muted text-sm mt-0.5">
              Edit any section, then write an article from this brief.
            </p>
          </div>
          {saving && (
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving…
            </span>
          )}
        </div>

        {/* Recommended title */}
        <Card>
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Recommended title
            </p>
            {editingField !== 'recommended_title' && (
              <button
                onClick={() => startEdit('recommended_title', bc.recommended_title)}
                className="text-text-muted hover:text-accent transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          {editingField === 'recommended_title' ? (
            <div className="space-y-2">
              <Input
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={cancelEdit} className="px-3 py-1.5 text-sm">
                  <XIcon className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button onClick={() => commitEdit('recommended_title')} className="px-3 py-1.5 text-sm">
                  <Check className="w-3.5 h-3.5" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="font-display text-xl font-semibold text-text">
              {bc.recommended_title}
            </p>
          )}
        </Card>

        {/* Keywords row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              Long-tail variants
            </p>
            <div className="flex flex-wrap gap-1.5">
              {bc.long_tail_variants.map((kw) => (
                <Badge key={kw} variant="accent">
                  {kw}
                </Badge>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              Semantic keywords
            </p>
            <div className="flex flex-wrap gap-1.5">
              {bc.semantic_keywords.map((kw) => (
                <Badge key={kw}>{kw}</Badge>
              ))}
            </div>
          </Card>
        </div>

        {/* People Also Ask */}
        <Card>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
            People also ask
          </p>
          <ul className="space-y-2">
            {bc.people_also_ask.map((q, i) => (
              <li
                key={i}
                className="text-sm text-text pl-4 border-l-2 border-accent-light py-1"
              >
                {q}
              </li>
            ))}
          </ul>
        </Card>

        {/* Outline */}
        <Card>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
            Article outline
          </p>
          <p className="text-xs text-text-muted mb-4">
            Target: {bc.target_word_count_min}–{bc.target_word_count_max} words
          </p>
          <div className="space-y-4">
            {bc.outline.map((section, i) => (
              <div
                key={i}
                className="border border-border rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-text">{section.heading}</h3>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    ~{section.word_allocation} words
                  </span>
                </div>
                {section.subheadings && section.subheadings.length > 0 && (
                  <div className="pl-4 space-y-1">
                    {section.subheadings.map((sub, j) => (
                      <p key={j} className="text-sm text-text-muted">
                        — {sub}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-sm text-text-muted">{section.notes}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Internal links */}
        {bc.internal_links && bc.internal_links.length > 0 && (
          <Card>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
              Internal link suggestions
            </p>
            <div className="space-y-2">
              {bc.internal_links.map((link, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm"
                >
                  <Link2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-text break-all">{link.url}</p>
                    <p className="text-text-muted">
                      Anchor: &quot;{link.anchor_suggestion}&quot;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Writing notes */}
        <Card>
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Writing notes
            </p>
            {editingField !== 'writing_notes' && (
              <button
                onClick={() => startEdit('writing_notes', bc.writing_notes)}
                className="text-text-muted hover:text-accent transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          {editingField === 'writing_notes' ? (
            <div className="space-y-2">
              <Textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                className="min-h-[100px]"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={cancelEdit} className="px-3 py-1.5 text-sm">
                  <XIcon className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button onClick={() => commitEdit('writing_notes')} className="px-3 py-1.5 text-sm">
                  <Check className="w-3.5 h-3.5" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text whitespace-pre-wrap">
              {bc.writing_notes}
            </p>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="secondary"
            onClick={() => router.push('/opportunities')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to opportunities
          </Button>
          <Button
            onClick={() => {
              if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
                saveBrief(bc);
              }
              toast.success('Brief is ready. Create an article from it in the next stage.');
            }}
          >
            <Save className="w-4 h-4" />
            Finalise brief
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
