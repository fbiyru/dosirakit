'use client';

import { Textarea } from '@/components/ui/textarea';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function Step7ImagePrompts({ data, updateData }: StepProps) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">AI Image Prompts</h2>
      <Textarea
        label="Describe your preferred photo/image style"
        hint="This will be used to generate AI image prompts for your articles."
        value={data.image_prompt_style}
        onChange={(e) => updateData({ image_prompt_style: e.target.value })}
        placeholder="E.g. Close-up food photography, warm natural lighting, wooden table surface, Korean ceramics, vibrant colours, shallow depth of field."
      />
    </div>
  );
}
