'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { AngleCard } from '@/components/article/AngleCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Loader2, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Angle {
  id: string;
  angle_number: number;
  title: string;
  description: string;
  article_type: string;
  redo_round: number;
}

export default function OpportunityAnglesPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;

  const [angles, setAngles] = useState<Angle[]>([]);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [showRedoModal, setShowRedoModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [redoing, setRedoing] = useState(false);

  useEffect(() => {
    async function init() {
      const brandId = localStorage.getItem('activeBrandId');
      if (!brandId) { router.push('/dashboard'); return; }

      const supabase = createClient();

      const { data: opp } = await supabase
        .from('opportunities')
        .select('keyword')
        .eq('id', opportunityId)
        .single();

      if (!opp) {
        toast.error('Opportunity not found');
        router.push('/opportunities');
        return;
      }

      setKeyword(opp.keyword);

      // Check if an article has already been created for this opportunity
      const { data: existingArticle } = await supabase
        .from('articles')
        .select('id')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingArticle) {
        setArticleId(existingArticle.id);
        await loadAngles(existingArticle.id);
        setLoading(false);
      } else {
        setLoading(false);
        setGenerating(true);
        try {
          const res = await fetch('/api/angles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              focus_keyword: opp.keyword,
              brand_id: brandId,
              opportunity_id: opportunityId,
              generate_image_prompts: true,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to generate angles');
          setArticleId(data.article_id);
          setAngles(data.angles);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to generate angles');
        } finally {
          setGenerating(false);
        }
      }
    }
    init();
  }, [opportunityId, router]);

  async function loadAngles(artId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('article_angles')
      .select('*')
      .eq('article_id', artId)
      .order('redo_round', { ascending: false })
      .order('angle_number');

    if (data && data.length > 0) {
      const maxRound = Math.max(...data.map((a) => a.redo_round));
      setAngles(data.filter((a) => a.redo_round === maxRound));
    }
  }

  async function handleSelect(angleId: string) {
    if (!articleId) return;
    setSelecting(true);
    const supabase = createClient();

    await supabase
      .from('article_angles')
      .update({ selected: true })
      .eq('id', angleId);

    router.push(`/opportunities/${opportunityId}/brief?article_id=${articleId}`);
  }

  async function handleRedo() {
    if (!feedback.trim() || !articleId) return;
    setRedoing(true);
    try {
      const res = await fetch('/api/redo-angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, feedback: feedback.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate angles');
      }
      const data = await res.json();
      setAngles(data.angles);
      setShowRedoModal(false);
      setFeedback('');
      toast.success('New angles generated!');
    } catch {
      toast.error('Failed to generate new angles');
    } finally {
      setRedoing(false);
    }
  }

  if (loading || generating) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-text-muted text-sm">
            {generating ? 'Generating angle options…' : 'Loading…'}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/opportunities"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to opportunities
          </Link>
          <h1 className="font-display text-3xl font-bold text-text text-center mb-2">
            Choose your angle
          </h1>
          <p className="text-text-muted text-center">
            <span className="font-medium text-text">{keyword}</span> — pick the
            direction that feels right, then we&apos;ll build the brief.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {angles.map((angle) => (
            <AngleCard
              key={angle.id}
              id={angle.id}
              title={angle.title}
              description={angle.description}
              articleType={angle.article_type}
              onSelect={handleSelect}
              loading={selecting}
            />
          ))}
        </div>

        <div className="text-center">
          <Button variant="secondary" onClick={() => setShowRedoModal(true)}>
            <RefreshCw className="w-4 h-4" />
            Redo All Angles
          </Button>
        </div>

        {showRedoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-text">
                  What didn&apos;t work?
                </h2>
                <button
                  onClick={() => setShowRedoModal(false)}
                  className="text-text-muted hover:text-text p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-text-muted mb-4">
                Your feedback helps us generate better options.
              </p>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. I want more recipe-focused angles, less cultural history..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="secondary" onClick={() => setShowRedoModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRedo} disabled={redoing || !feedback.trim()}>
                  {redoing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate New Angles'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
