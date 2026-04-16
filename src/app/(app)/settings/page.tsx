'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TagInput } from '@/components/ui/tag-input';
import { Loader2, Save, Pencil, Check, X as XIcon } from 'lucide-react';
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

type FieldType = 'text' | 'textarea' | 'tags' | 'password';

interface FieldSection {
  label: string;
  key: keyof BrandSettings;
  type: FieldType;
  editable: boolean;
  wide?: boolean;
  placeholder?: string;
}

const SECTIONS: FieldSection[] = [
  { label: 'Brand name', key: 'site_name', type: 'text', editable: false },
  { label: 'Website URL', key: 'site_url', type: 'text', editable: false },
  { label: 'Brand story', key: 'brand_story', type: 'textarea', editable: true, wide: true },
  { label: 'Target audience', key: 'target_audience', type: 'textarea', editable: true },
  { label: 'Tone and voice', key: 'tone_and_voice', type: 'textarea', editable: true, wide: true },
  { label: 'Content guidelines / restrictions', key: 'content_guidelines', type: 'textarea', editable: true, wide: true },
  { label: 'Things to always include', key: 'things_to_always_include', type: 'textarea', editable: true },
  { label: 'Things to never include', key: 'things_to_never_include', type: 'textarea', editable: true },
  { label: 'Content categories', key: 'content_categories', type: 'tags', editable: true, wide: true },
  { label: 'Image prompt style', key: 'image_prompt_style', type: 'textarea', editable: true, wide: true },
  { label: 'WordPress site URL', key: 'wp_site_url', type: 'text', editable: true },
  { label: 'WordPress username', key: 'wp_username', type: 'text', editable: true },
  { label: 'WordPress app password', key: 'wp_app_password', type: 'password', editable: true },
];

function displayString(val: BrandSettings[keyof BrandSettings], type: FieldType): string {
  if (type === 'tags') {
    if (Array.isArray(val) && val.length > 0) return val.join(', ');
    return '—';
  }
  if (type === 'password') {
    return typeof val === 'string' && val.length > 0 ? '••••••••' : '—';
  }
  if (typeof val === 'string' && val.trim()) return val;
  return '—';
}

interface SettingFieldProps {
  section: FieldSection;
  value: BrandSettings[keyof BrandSettings];
  onSave: (next: string | string[]) => Promise<void>;
}

function SettingField({ section, value, onSave }: SettingFieldProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);

  function startEdit() {
    if (section.type === 'tags') {
      setTagsDraft(Array.isArray(value) ? [...value] : []);
    } else if (section.type === 'password') {
      setTextDraft('');
    } else {
      setTextDraft(typeof value === 'string' ? value : '');
    }
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setTextDraft('');
    setTagsDraft([]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (section.type === 'tags') {
        await onSave(tagsDraft);
      } else {
        await onSave(textDraft);
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={section.wide ? 'md:col-span-2' : ''}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
          {section.label}
        </p>
        {section.editable && !editing && (
          <button
            onClick={startEdit}
            className="text-text-muted hover:text-accent transition-colors duration-200"
            aria-label={`Edit ${section.label}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {!editing ? (
        <p className="text-text text-sm whitespace-pre-wrap">
          {displayString(value, section.type)}
        </p>
      ) : (
        <div className="space-y-3">
          {section.type === 'text' && (
            <Input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder={section.placeholder}
              autoFocus
            />
          )}
          {section.type === 'password' && (
            <Input
              type="password"
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Enter new password"
              autoFocus
            />
          )}
          {section.type === 'textarea' && (
            <Textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder={section.placeholder}
              className="min-h-[120px]"
              autoFocus
            />
          )}
          {section.type === 'tags' && (
            <TagInput
              value={tagsDraft}
              onChange={setTagsDraft}
              placeholder="Type and press Enter"
            />
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 text-sm"
            >
              <XIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

interface WordCountCardProps {
  min: number;
  max: number;
  onSave: (min: number, max: number) => Promise<void>;
}

function WordCountCard({ min, max, onSave }: WordCountCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [minDraft, setMinDraft] = useState(min);
  const [maxDraft, setMaxDraft] = useState(max);

  function startEdit() {
    setMinDraft(min);
    setMaxDraft(max);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function handleSave() {
    if (maxDraft < minDraft) {
      toast.error('Maximum must be greater than or equal to minimum.');
      return;
    }
    if (minDraft < 1 || maxDraft < 1) {
      toast.error('Word counts must be at least 1.');
      return;
    }
    setSaving(true);
    try {
      await onSave(minDraft, maxDraft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
          Default word count
        </p>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-text-muted hover:text-accent transition-colors duration-200"
            aria-label="Edit default word count"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {!editing ? (
        <p className="text-text text-sm">
          {min} – {max} words
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Min</label>
              <Input
                type="number"
                min={1}
                value={minDraft}
                onChange={(e) => setMinDraft(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Max</label>
              <Input
                type="number"
                min={1}
                value={maxDraft}
                onChange={(e) => setMaxDraft(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 text-sm"
            >
              <XIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
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

  async function updateField<K extends keyof BrandSettings>(
    key: K,
    value: BrandSettings[K]
  ) {
    if (!settings) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('brand_settings')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('brand_id', settings.brand_id);
    if (error) {
      toast.error(error.message || 'Failed to save');
      throw error;
    }
    setSettings({ ...settings, [key]: value });
    toast.success('Saved.');
  }

  async function updateWordCount(min: number, max: number) {
    if (!settings) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('brand_settings')
      .update({
        default_word_count_min: min,
        default_word_count_max: max,
        updated_at: new Date().toISOString(),
      })
      .eq('brand_id', settings.brand_id);
    if (error) {
      toast.error(error.message || 'Failed to save');
      throw error;
    }
    setSettings({
      ...settings,
      default_word_count_min: min,
      default_word_count_max: max,
    });
    toast.success('Saved.');
  }

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

      const supabase = createClient();
      const { error } = await supabase
        .from('brand_settings')
        .update({
          ...updated_settings,
          updated_at: new Date().toISOString(),
        })
        .eq('brand_id', settings.brand_id);

      if (error) throw error;

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

        <p className="text-sm text-text-muted">
          Click the pencil icon on any card to edit it directly. Brand name and
          website URL can&apos;t be changed from here.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map((section) => (
            <SettingField
              key={section.key}
              section={section}
              value={settings[section.key]}
              onSave={(next) => updateField(section.key, next as never)}
            />
          ))}
          <WordCountCard
            min={settings.default_word_count_min}
            max={settings.default_word_count_max}
            onSave={updateWordCount}
          />
        </div>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-text">
            What would you like to change?
          </h2>
          <p className="text-sm text-text-muted">
            Prefer describing a change in plain language? Use this box and Claude
            will figure out which fields to update. For example: &quot;Add a rule
            to never use em dashes&quot; or &quot;Change my target audience to
            include beginners&quot;.
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
