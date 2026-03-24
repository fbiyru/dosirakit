'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface BrandSettings {
  brand_id: string;
  tone_and_voice: string | null;
  target_audience: string | null;
  brand_story: string | null;
  unique_selling_points: string | null;
  content_guidelines: string | null;
  things_to_always_include: string | null;
  things_to_never_include: string | null;
  default_word_count_min: number;
  default_word_count_max: number;
  content_categories: string[] | null;
  content_tags: string[] | null;
  site_name: string | null;
  site_url: string | null;
  meta_description_style: string | null;
  image_prompt_style: string | null;
  wp_site_url: string | null;
  wp_username: string | null;
  wp_app_password: string | null;
}

interface SettingsSection {
  label: string;
  key: keyof BrandSettings;
  type: 'text' | 'tags' | 'number-range';
}

const SECTIONS: SettingsSection[] = [
  { label: 'Brand name', key: 'site_name', type: 'text' },
  { label: 'Website URL', key: 'site_url', type: 'text' },
  { label: 'Brand story', key: 'brand_story', type: 'text' },
  { label: 'Target audience', key: 'target_audience', type: 'text' },
  { label: 'Tone and voice', key: 'tone_and_voice', type: 'text' },
  { label: 'Content guidelines / restrictions', key: 'content_guidelines', type: 'text' },
  { label: 'Things to always include', key: 'things_to_always_include', type: 'text' },
  { label: 'Things to never include', key: 'things_to_never_include', type: 'text' },
  { label: 'Content categories', key: 'content_categories', type: 'tags' },
  { label: 'Default word count', key: 'default_word_count_min', type: 'number-range' },
  { label: 'Image prompt style', key: 'image_prompt_style', type: 'text' },
  { label: 'WordPress site URL', key: 'wp_site_url', type: 'text' },
  { label: 'WordPress username', key: 'wp_username', type: 'text' },
  { label: 'WordPress app password', key: 'wp_app_password', type: 'text' },
];

function displayValue(settings: BrandSettings, section: SettingsSection): string {
  if (section.type === 'number-range') {
    return `${settings.default_word_count_min} – ${settings.default_word_count_max} words`;
  }
  if (section.type === 'tags') {
    const val = settings[section.key];
    if (Array.isArray(val) && val.length > 0) return val.join(', ');
    return '—';
  }
  const val = settings[section.key];
  if (section.key === 'wp_app_password' && val) return '••••••••';
  if (typeof val === 'string' && val.trim()) return val;
  return '—';
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [brandName, setBrandName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeRequest, setChangeRequest] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const brandId = localStorage.getItem('activeBrandId');
      if (!brandId) {
        router.push('/dashboard');
        return;
      }

      const { data: brand } = await supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .single();

      if (brand) setBrandName(brand.name);

      const { data } = await supabase
        .from('brand_settings')
        .select('*')
        .eq('brand_id', brandId)
        .single();

      if (data) {
        setSettings(data as BrandSettings);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSubmit() {
    if (!changeRequest.trim() || !settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/brand-settings-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: settings.brand_id,
          change_request: changeRequest,
          current_settings: settings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      const { updated_settings } = await res.json();

      // Apply updates to Supabase
      const supabase = createClient();
      const { error } = await supabase
        .from('brand_settings')
        .update({
          ...updated_settings,
          updated_at: new Date().toISOString(),
        })
        .eq('brand_id', settings.brand_id);

      if (error) throw error;

      // Refresh settings from DB
      const { data: fresh } = await supabase
        .from('brand_settings')
        .select('*')
        .eq('brand_id', settings.brand_id)
        .single();

      if (fresh) setSettings(fresh as BrandSettings);

      setChangeRequest('');
      toast.success('Brand settings updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </AppShell>
    );
  }

  if (!settings) {
    return (
      <AppShell>
        <div className="p-6 md:p-8 max-w-4xl mx-auto text-center">
          <p className="text-text-muted">No brand settings found. Please complete onboarding first.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-text">Brand Settings</h1>
          <p className="text-text-muted mt-1">{brandName}</p>
        </div>

        {/* Current settings display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map((section) => (
            <Card key={section.key} className={section.key === 'brand_story' || section.key === 'content_guidelines' || section.key === 'tone_and_voice' ? 'md:col-span-2' : ''}>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                {section.label}
              </p>
              <p className="text-text text-sm whitespace-pre-wrap">
                {displayValue(settings, section)}
              </p>
            </Card>
          ))}
        </div>

        {/* Change request box */}
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-text">
            What would you like to change?
          </h2>
          <p className="text-sm text-text-muted">
            Describe what you want to update in plain language. For example: &quot;Add a rule to never use em dashes&quot; or &quot;Change my target audience to include beginners&quot; or &quot;Update my WordPress password to xyz&quot;.
          </p>
          <Textarea
            value={changeRequest}
            onChange={(e) => setChangeRequest(e.target.value)}
            placeholder='e.g. "Add to things to never include: em dashes, the word delve, phrases like rich tapestry"'
            className="min-h-[120px]"
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={saving || !changeRequest.trim()}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Settings
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
