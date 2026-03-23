'use client';

import { Textarea } from '@/components/ui/textarea';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function Step6SEO({ data, updateData }: StepProps) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">SEO Preferences</h2>
      <Textarea
        label="Anything specific about how you like your titles written?"
        hint="Optional"
        value={data.title_preferences}
        onChange={(e) => updateData({ title_preferences: e.target.value })}
        placeholder="E.g. I prefer question-based titles, keep them under 60 characters..."
      />
    </div>
  );
}
