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
        label="Content rules and restrictions"
        hint="Include everything: dietary rules, things to always mention, things to never say, brand-specific dos and don'ts"
        value={data.content_guidelines}
        onChange={(e) => updateData({ content_guidelines: e.target.value })}
        placeholder={"E.g.\n- Halal-only, no pork, no alcohol\n- Always mention prep time and difficulty level\n- Never use the word 'delicious'\n- Never compare cuisines\n- Always note when a dish can be made vegetarian"}
        rows={8}
      />
    </div>
  );
}
