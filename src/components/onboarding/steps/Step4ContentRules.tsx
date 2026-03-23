'use client';

import { Textarea } from '@/components/ui/textarea';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function Step4ContentRules({ data, updateData }: StepProps) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">Content Rules</h2>
      <Textarea
        label="Content restrictions"
        hint="E.g. no alcohol references, always mention allergens, vegetarian-friendly only"
        value={data.content_guidelines}
        onChange={(e) => updateData({ content_guidelines: e.target.value })}
        placeholder="List any content restrictions or requirements..."
      />
      <div>
        <Textarea
          label="Things to ALWAYS include across all articles"
          hint="AI will adapt how these are applied depending on the article type (recipe, guide, listicle, etc.)"
          value={data.things_to_always_include}
          onChange={(e) => updateData({ things_to_always_include: e.target.value })}
          placeholder="E.g. prep time, difficulty level, serving suggestions, source links..."
        />
      </div>
      <Textarea
        label="Things to NEVER include — universal rules and brand-specific rules"
        hint="Mix both universal rules (e.g. no AI clichés) and brand-specific rules (e.g. never mention competitor brands) in one list"
        value={data.things_to_never_include}
        onChange={(e) => updateData({ things_to_never_include: e.target.value })}
        placeholder="E.g. never use the word 'delicious', never compare cuisines, no unverified health claims..."
      />
    </div>
  );
}
