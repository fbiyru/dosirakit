'use client';

import { Input } from '@/components/ui/input';
import { TagInput } from '@/components/ui/tag-input';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function Step5ContentStructure({ data, updateData }: StepProps) {
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
      <TagInput
        label="Your main content categories"
        hint="E.g. Korean Recipes, Meal Prep, Korean Pantry, Restaurant Reviews"
        value={data.content_categories}
        onChange={(tags) => updateData({ content_categories: tags })}
        placeholder="Type a category and press Enter"
      />
      <TagInput
        label="Common tags you use"
        value={data.content_tags}
        onChange={(tags) => updateData({ content_tags: tags })}
        placeholder="Type a tag and press Enter"
      />
    </div>
  );
}
