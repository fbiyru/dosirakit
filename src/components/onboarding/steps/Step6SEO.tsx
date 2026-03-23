'use client';

import { Textarea } from '@/components/ui/textarea';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

const META_STYLES = [
  { value: 'first-person', label: 'First-person, conversational' },
  { value: 'third-person', label: 'Third-person, descriptive' },
  { value: 'question-led', label: 'Question-led' },
  { value: 'custom', label: "I'll write my own" },
];

export function Step6SEO({ data, updateData }: StepProps) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">SEO Preferences</h2>
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Meta description style
        </label>
        <div className="space-y-2">
          {META_STYLES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="meta_style"
                value={value}
                checked={data.meta_description_style === value}
                onChange={() => updateData({ meta_description_style: value })}
                className="w-4 h-4 text-accent focus:ring-accent/30"
              />
              <span className="text-sm text-text">{label}</span>
            </label>
          ))}
        </div>
      </div>
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
