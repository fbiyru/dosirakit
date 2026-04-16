'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Step1BrandIdentity } from './steps/Step1BrandIdentity';
import { Step2YourReader } from './steps/Step2YourReader';
import { Step3ToneVoice } from './steps/Step3ToneVoice';
import { Step4ContentRules } from './steps/Step4ContentRules';
import { Step5ContentStructure } from './steps/Step5ContentStructure';
import { Step6SEO } from './steps/Step6SEO';
import { Step7ImagePrompts } from './steps/Step7ImagePrompts';
import { Step8WordPress } from './steps/Step8WordPress';
import { Step9Review } from './steps/Step9Review';

const STEP_LABELS = [
  'Brand Identity',
  'Your Reader',
  'Tone & Voice',
  'Content Rules',
  'Content Structure',
  'SEO',
  'Image Prompts',
  'WordPress',
  'Review & Launch',
];

export interface OnboardingData {
  // Step 1
  brand_name: string;
  site_url: string;
  brand_tagline: string;
  brand_story: string;
  // Step 2
  target_audience: string;
  traffic_sources: string[];
  // Step 3
  tone_and_voice: string;
  voice_adjectives: string[];
  first_person: 'yes' | 'no' | 'sometimes';
  // Step 4
  content_guidelines: string;
  things_to_always_include: string;
  things_to_never_include: string;
  // Step 5
  default_word_count_min: number;
  default_word_count_max: number;
  content_categories: string[];
  // Step 6
  title_preferences: string;
  // Step 7
  image_prompt_style: string;
  // Step 8
  wp_site_url: string;
  wp_username: string;
  wp_app_password: string;
}

const DEFAULT_DATA: OnboardingData = {
  brand_name: '',
  site_url: '',
  brand_tagline: '',
  brand_story: '',
  target_audience: '',
  traffic_sources: [],
  tone_and_voice: '',
  voice_adjectives: [],
  first_person: 'yes',
  content_guidelines: '',
  things_to_always_include: '',
  things_to_never_include: '',
  default_word_count_min: 800,
  default_word_count_max: 1200,
  content_categories: [],
  title_preferences: '',
  image_prompt_style: '',
  wp_site_url: '',
  wp_username: '',
  wp_app_password: '',
};

interface OnboardingWizardProps {
  brandId?: string | null;
  isNewBrand?: boolean;
}

export function OnboardingWizard({ brandId, isNewBrand }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));
  const goToStep = (s: number) => setStep(s);

  async function handleFinish() {
    setSaving(true);
    try {
      const supabase = createClient();

      // Create or get brand
      let currentBrandId = brandId;
      if (!currentBrandId) {
        const slug = data.brand_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .insert({ name: data.brand_name, slug })
          .select('id')
          .single();

        if (brandError) throw brandError;
        currentBrandId = brand.id;
      }

      // Upsert brand settings
      const { error: settingsError } = await supabase
        .from('brand_settings')
        .upsert({
          brand_id: currentBrandId,
          tone_and_voice: data.tone_and_voice,
          target_audience: data.target_audience,
          brand_story: data.brand_story,
          content_guidelines: data.content_guidelines,
          things_to_always_include: data.things_to_always_include,
          things_to_never_include: data.things_to_never_include,
          default_word_count_min: data.default_word_count_min,
          default_word_count_max: data.default_word_count_max,
          content_categories: data.content_categories,
          content_tags: [],
          site_name: data.brand_name,
          site_url: data.site_url,
          image_prompt_style: data.image_prompt_style,
          wp_site_url: data.wp_site_url || null,
          wp_username: data.wp_username || null,
          wp_app_password: data.wp_app_password || null,
          onboarding_complete: true,
        }, { onConflict: 'brand_id' });

      if (settingsError) throw settingsError;

      // Set active brand
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeBrandId', currentBrandId!);
      }

      toast.success('Brand setup complete! Setting up your site profile…');
      router.push('/brand/site-profile');
      router.refresh();
    } catch (err) {
      toast.error('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const stepComponents = [
    <Step1BrandIdentity key={0} data={data} updateData={updateData} />,
    <Step2YourReader key={1} data={data} updateData={updateData} />,
    <Step3ToneVoice key={2} data={data} updateData={updateData} />,
    <Step4ContentRules key={3} data={data} updateData={updateData} />,
    <Step5ContentStructure key={4} data={data} updateData={updateData} />,
    <Step6SEO key={5} data={data} updateData={updateData} />,
    <Step7ImagePrompts key={6} data={data} updateData={updateData} />,
    <Step8WordPress key={7} data={data} updateData={updateData} />,
    <Step9Review key={8} data={data} goToStep={goToStep} />,
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-text mb-1">
            {isNewBrand ? 'Set up a new brand' : 'Welcome to Dosirakit'}
          </h1>
          {!isNewBrand && (
            <p className="text-text-muted">
              Let&apos;s set up your brand so the AI knows how to write for you.
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
          {STEP_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => i <= step && goToStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                i === step
                  ? 'bg-accent text-white'
                  : i < step
                  ? 'bg-accent-light text-accent-dark cursor-pointer'
                  : 'bg-surface-alt text-text-muted'
              }`}
            >
              {i < step && <Check className="w-3 h-3" />}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          {stepComponents[step]}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={goPrev}
            disabled={step === 0}
          >
            Previous
          </Button>

          {step < STEP_LABELS.length - 1 ? (
            <Button onClick={goNext}>Next</Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving}>
              {saving ? 'Saving...' : 'Launch Dosirak'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
