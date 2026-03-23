'use client';

import { Textarea } from '@/components/ui/textarea';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

const TRAFFIC_SOURCES = [
  'Search / Google',
  'Social media',
  'Word of mouth',
  'Email newsletter',
  'Other',
];

export function Step2YourReader({ data, updateData }: StepProps) {
  function toggleSource(source: string) {
    const current = data.traffic_sources;
    if (current.includes(source)) {
      updateData({ traffic_sources: current.filter((s) => s !== source) });
    } else {
      updateData({ traffic_sources: [...current, source] });
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">Your Reader</h2>
      <Textarea
        label="Who is your target audience?"
        hint="Who reads your blog? Age, interests, cooking level, what they're looking for"
        value={data.target_audience}
        onChange={(e) => updateData({ target_audience: e.target.value })}
        placeholder="E.g. Home cooks aged 25-45 who are curious about Korean food..."
      />
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Where do your readers come from?
        </label>
        <div className="space-y-2">
          {TRAFFIC_SOURCES.map((source) => (
            <label key={source} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.traffic_sources.includes(source)}
                onChange={() => toggleSource(source)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30"
              />
              <span className="text-sm text-text">{source}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
