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
        label="Dietary / content restrictions"
        hint="E.g. halal-only, no pork, no alcohol, no lard. Always note when a dish can be made vegetarian."
        value={data.content_guidelines}
        onChange={(e) => updateData({ content_guidelines: e.target.value })}
        placeholder="List any dietary or content restrictions..."
      />
      <Textarea
        label="Things to ALWAYS include in articles"
        value={data.things_to_always_include}
        onChange={(e) => updateData({ things_to_always_include: e.target.value })}
        placeholder="E.g. prep time, difficulty level, serving suggestions..."
      />
      <Textarea
        label="Things to NEVER include or say"
        value={data.things_to_never_include}
        onChange={(e) => updateData({ things_to_never_include: e.target.value })}
        placeholder="E.g. never say 'exotic', never compare Korean food to other cuisines..."
      />
    </div>
  );
}
