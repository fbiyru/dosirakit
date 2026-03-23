'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

const PLACEMENTS = [
  { value: 'intro', label: 'At the start — hook the reader with my experience' },
  { value: 'middle', label: 'In the middle — as a natural break or supporting point' },
  { value: 'end', label: 'At the end — as a personal conclusion' },
  { value: 'natural', label: "Let Claude decide — place it wherever it fits best" },
];

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [experience, setExperience] = useState('');
  const [memory, setMemory] = useState('');
  const [unique, setUnique] = useState('');
  const [placement, setPlacement] = useState('intro');
  const [saving, setSaving] = useState(false);

  async function saveAndGenerate() {
    setSaving(true);
    const supabase = createClient();
    const storyContent = [experience, memory, unique].filter(Boolean).join('\n\n');
    const hasStory = storyContent.trim().length > 0;

    const { error } = await supabase
      .from('articles')
      .update({
        story_provided: hasStory,
        story_content: hasStory ? storyContent : null,
        story_placement: hasStory ? placement : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', articleId);

    if (error) {
      toast.error('Failed to save story');
      setSaving(false);
      return;
    }

    router.push(`/article/${articleId}/generate`);
  }

  function skipStory() {
    router.push(`/article/${articleId}/generate`);
  }

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8 text-xs font-medium">
          {['Keyword', 'Angle', 'Your Story', 'Article'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full ${
                  i === 2
                    ? 'bg-accent text-white'
                    : i < 2
                    ? 'bg-accent-light text-accent-dark'
                    : 'bg-surface-alt text-text-muted'
                }`}
              >
                {step}
              </span>
              {i < 3 && <span className="text-border">—</span>}
            </div>
          ))}
        </div>

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-text mb-2">
            Add your personal touch
          </h1>
          <p className="text-text-muted">
            Share a memory, experience, or detail only you could know. Claude will weave it naturally into your article.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <Card>
            <Textarea
              label="Your experience with this topic"
              hint="Have you made this dish? Visited this place? Used this ingredient?"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="e.g. The first time I made tteokbokki at home, I completely underestimated how spicy gochujang could get..."
            />
          </Card>

          <Card>
            <Textarea
              label="A specific detail or memory"
              hint="Any specific detail — a smell, a place, a person, a moment — that connects you to this topic?"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder="e.g. My mother-in-law taught me this technique when I visited Seoul in 2019..."
            />
          </Card>

          <Card>
            <Textarea
              label="Anything unique to share with your readers"
              hint="A tip, a mistake you made, a cultural note — something your readers won't find elsewhere"
              value={unique}
              onChange={(e) => setUnique(e.target.value)}
              placeholder="e.g. Most Western recipes skip the resting step entirely, but I've found that letting the dough sit for 20 minutes makes a huge difference..."
            />
          </Card>
        </div>

        {/* Placement selector */}
        <Card className="mb-8">
          <p className="text-sm font-medium text-text mb-3">
            Where should this story appear?
          </p>
          <div className="space-y-2">
            {PLACEMENTS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="placement"
                  value={value}
                  checked={placement === value}
                  onChange={() => setPlacement(value)}
                  className="w-4 h-4 text-accent focus:ring-accent/30"
                />
                <span className="text-sm text-text">{label}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={saveAndGenerate} disabled={saving}>
            {saving ? 'Saving...' : 'Generate Article'}
          </Button>
          <Button variant="secondary" onClick={skipStory}>
            Skip — generate without personal story
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
