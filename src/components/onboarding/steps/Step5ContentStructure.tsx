'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { TagInput } from '@/components/ui/tag-input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function Step5ContentStructure({ data, updateData }: StepProps) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  async function handleAISuggest() {
    if (!data.brand_name.trim()) {
      toast.error('Please enter a brand name in Step 1 first');
      return;
    }

    setSuggesting(true);
    setSuggestions(null);
    try {
      const res = await fetch('/api/suggest-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: data.brand_name,
          brand_story: data.brand_story,
          target_audience: data.target_audience,
        }),
      });

      if (!res.ok) throw new Error('Failed to get suggestions');

      const result = await res.json();
      setSuggestions(result.categories);
    } catch {
      toast.error('Could not generate suggestions. Try again.');
    } finally {
      setSuggesting(false);
    }
  }

  function acceptSuggestion(category: string) {
    if (!data.content_categories.includes(category)) {
      updateData({ content_categories: [...data.content_categories, category] });
    }
    setSuggestions((prev) => prev?.filter((s) => s !== category) ?? null);
  }

  function acceptAll() {
    const newCategories = (suggestions ?? []).filter(
      (s) => !data.content_categories.includes(s)
    );
    updateData({ content_categories: [...data.content_categories, ...newCategories] });
    setSuggestions(null);
  }

  function dismissAll() {
    setSuggestions(null);
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">Content Structure</h2>
      <div>
        <label className="block text-sm font-medium text-text mb-1.5">
          Default article word count range
        </label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={data.default_word_count_min}
            onChange={(e) => updateData({ default_word_count_min: parseInt(e.target.value) || 800 })}
            className="w-28"
          />
          <span className="text-text-muted">to</span>
          <Input
            type="number"
            value={data.default_word_count_max}
            onChange={(e) => updateData({ default_word_count_max: parseInt(e.target.value) || 1200 })}
            className="w-28"
          />
          <span className="text-text-muted text-sm">words</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-text">
            Your main content categories
          </label>
          <Button
            variant="ghost"
            onClick={handleAISuggest}
            disabled={suggesting}
            className="text-xs gap-1.5"
          >
            {suggesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {suggesting ? 'Thinking...' : 'AI Suggest'}
          </Button>
        </div>
        <TagInput
          hint="Type a category and press Enter, or use AI Suggest to get started"
          value={data.content_categories}
          onChange={(tags) => updateData({ content_categories: tags })}
          placeholder="e.g. Recipes, Meal Prep, Restaurant Reviews"
        />
        {suggestions && suggestions.length > 0 && (
          <div className="mt-3 p-3 bg-accent-light rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-accent-dark">AI Suggestions</span>
              <div className="flex gap-2">
                <button
                  onClick={acceptAll}
                  className="text-xs text-accent-dark hover:text-accent font-medium transition-colors"
                >
                  Accept all
                </button>
                <button
                  onClick={dismissAll}
                  className="text-xs text-text-muted hover:text-text font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => acceptSuggestion(s)}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-border text-text hover:border-accent hover:text-accent transition-colors duration-200"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
