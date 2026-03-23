'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { AngleCard } from '@/components/article/AngleCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Angle {
  id: string;
  angle_number: number;
  title: string;
  description: string;
  article_type: string;
  redo_round: number;
}

export default function AnglesPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [angles, setAngles] = useState<Angle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [showRedoModal, setShowRedoModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [redoing, setRedoing] = useState(false);

  useEffect(() => {
    loadAngles();
  }, [articleId]);

  async function loadAngles() {
    const supabase = createClient();
    const { data } = await supabase
      .from('article_angles')
      .select('*')
      .eq('article_id', articleId)
      .order('redo_round', { ascending: false })
      .order('angle_number');

    if (data) {
      // Get latest round
      const maxRound = Math.max(...data.map((a) => a.redo_round));
      setAngles(data.filter((a) => a.redo_round === maxRound));
    }
    setLoading(false);
  }

  async function handleSelect(angleId: string) {
    setSelecting(true);
    const supabase = createClient();

    await supabase
      .from('article_angles')
      .update({ selected: true })
      .eq('id', angleId);

    router.push(`/article/${articleId}/story`);
  }

  async function handleRedo() {
    if (!feedback.trim()) return;
    setRedoing(true);

    try {
      const res = await fetch('/api/redo-angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: articleId,
          feedback: feedback.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to regenerate angles');

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

  if (loading) {
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
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-text text-center mb-2">
          Choose your angle
        </h1>
        <p className="text-text-muted text-center mb-8">
          Pick the direction that feels right for this article.
        </p>

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
          <Button
            variant="secondary"
            onClick={() => setShowRedoModal(true)}
          >
            <RefreshCw className="w-4 h-4" />
            Redo All Angles
          </Button>
        </div>

        {/* Redo modal */}
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
