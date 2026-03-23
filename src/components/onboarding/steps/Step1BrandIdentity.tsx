'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function Step1BrandIdentity({ data, updateData }: StepProps) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-text">Brand Identity</h2>
      <Input
        label="Brand name"
        value={data.brand_name}
        onChange={(e) => updateData({ brand_name: e.target.value })}
        placeholder="Mama Kim Cooks"
      />
      <Input
        label="Blog / website URL"
        value={data.site_url}
        onChange={(e) => updateData({ site_url: e.target.value })}
        placeholder="https://mamakimcooks.com"
      />
      <Input
        label="Brand tagline"
        value={data.brand_tagline}
        onChange={(e) => updateData({ brand_tagline: e.target.value })}
        placeholder="Your tagline here"
      />
      <Textarea
        label="Brand story / About"
        hint="In 2-3 sentences, describe what your blog is about and who you are"
        value={data.brand_story}
        onChange={(e) => updateData({ brand_story: e.target.value })}
        placeholder="Tell us about your blog..."
      />
    </div>
  );
}
