'use client';

import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/ui/tag-input';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function Step3ToneVoice({ data, updateData }: StepProps) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">Tone & Voice</h2>
      <Textarea
        label="How would you describe your writing style?"
        hint="E.g. warm and maternal, like a friend teaching you to cook. Approachable, not pretentious."
        value={data.tone_and_voice}
        onChange={(e) => updateData({ tone_and_voice: e.target.value })}
        placeholder="Describe your writing voice..."
      />
      <TagInput
        label="Adjectives that describe your brand voice"
        hint="Type and press Enter to add (up to 6)"
        value={data.voice_adjectives}
        onChange={(tags) => updateData({ voice_adjectives: tags })}
        maxTags={6}
        placeholder="e.g. warm, approachable, knowledgeable"
      />
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Do you write in first person?
        </label>
        <div className="flex gap-2">
          {(['yes', 'no', 'sometimes'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateData({ first_person: option })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
                data.first_person === option
                  ? 'bg-accent text-white'
                  : 'border border-border text-text hover:bg-surface-alt'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
