'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';

interface StepProps {
  data: OnboardingData;
  goToStep: (step: number) => void;
}

function ReviewSection({
  title,
  stepIndex,
  goToStep,
  children,
}: {
  title: string;
  stepIndex: number;
  goToStep: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="relative">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-lg font-semibold text-text">{title}</h3>
        <button
          onClick={() => goToStep(stepIndex)}
          className="text-text-muted hover:text-accent transition-colors p-1"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
      <div className="text-sm text-text space-y-1">{children}</div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-text-muted">{label}:</span>{' '}
      <span>{value}</span>
    </div>
  );
}

export function Step9Review({ data, goToStep }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-text">Review & Launch</h2>
      <p className="text-sm text-text-muted">
        Review your settings below. Click the pencil icon to edit any section.
      </p>

      <ReviewSection title="Brand Identity" stepIndex={0} goToStep={goToStep}>
        <Field label="Name" value={data.brand_name} />
        <Field label="URL" value={data.site_url} />
        <Field label="Tagline" value={data.brand_tagline} />
        <Field label="Story" value={data.brand_story} />
      </ReviewSection>

      <ReviewSection title="Your Reader" stepIndex={1} goToStep={goToStep}>
        <Field label="Audience" value={data.target_audience} />
        {data.traffic_sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.traffic_sources.map((s) => (
              <Badge key={s} variant="accent">{s}</Badge>
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection title="Tone & Voice" stepIndex={2} goToStep={goToStep}>
        <Field label="Style" value={data.tone_and_voice} />
        {data.voice_adjectives.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.voice_adjectives.map((a) => (
              <Badge key={a} variant="accent">{a}</Badge>
            ))}
          </div>
        )}
        <Field label="First person" value={data.first_person} />
      </ReviewSection>

      <ReviewSection title="Content Rules" stepIndex={3} goToStep={goToStep}>
        <Field label="Guidelines" value={data.content_guidelines} />
        <Field label="Always include" value={data.things_to_always_include} />
        <Field label="Never include" value={data.things_to_never_include} />
      </ReviewSection>

      <ReviewSection title="Content Structure" stepIndex={4} goToStep={goToStep}>
        <div>
          <span className="text-text-muted">Word count:</span>{' '}
          {data.default_word_count_min}–{data.default_word_count_max} words
        </div>
        {data.content_categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.content_categories.map((c) => (
              <Badge key={c} variant="accent">{c}</Badge>
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection title="SEO" stepIndex={5} goToStep={goToStep}>
        <Field label="Meta style" value={data.meta_description_style} />
        <Field label="Title preferences" value={data.title_preferences} />
      </ReviewSection>

      <ReviewSection title="Image Prompts" stepIndex={6} goToStep={goToStep}>
        <Field label="Style" value={data.image_prompt_style} />
      </ReviewSection>

      <ReviewSection title="WordPress" stepIndex={7} goToStep={goToStep}>
        {data.wp_site_url ? (
          <>
            <Field label="Site" value={data.wp_site_url} />
            <Field label="User" value={data.wp_username} />
            <div>
              <span className="text-text-muted">Password:</span>{' '}
              <span>{'*'.repeat(8)}</span>
            </div>
          </>
        ) : (
          <p className="text-text-muted italic">Not configured — can be set up later</p>
        )}
      </ReviewSection>
    </div>
  );
}
