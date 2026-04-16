import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildVoiceExtractionPrompt } from '@/lib/claude/prompts';
import { handleAnthropicError } from '@/lib/claude/errors';

interface VoiceProfile {
  tone_and_personality: string;
  vocabulary_use: string[];
  vocabulary_avoid: string[];
  sentence_rhythm: string;
  point_of_view: string;
  dos: string[];
  donts: string[];
}

/**
 * Flatten a structured voice profile into markdown suitable for storage
 * in brand_settings.tone_and_voice. The markdown reads cleanly in the UI
 * and also gives the article generator richer context than a 1-line tone.
 */
function toMarkdown(profile: VoiceProfile): string {
  const lines: string[] = [];
  lines.push('## Tone and personality');
  lines.push(profile.tone_and_personality.trim());
  lines.push('');

  if (profile.vocabulary_use?.length) {
    lines.push('## Signature words and phrases to use');
    for (const w of profile.vocabulary_use) lines.push(`- ${w}`);
    lines.push('');
  }

  if (profile.vocabulary_avoid?.length) {
    lines.push('## Words and phrases to avoid');
    for (const w of profile.vocabulary_avoid) lines.push(`- ${w}`);
    lines.push('');
  }

  if (profile.sentence_rhythm) {
    lines.push('## Sentence rhythm');
    lines.push(profile.sentence_rhythm.trim());
    lines.push('');
  }

  if (profile.point_of_view) {
    lines.push('## Point of view');
    lines.push(profile.point_of_view.trim());
    lines.push('');
  }

  if (profile.dos?.length) {
    lines.push("## Do's");
    for (const d of profile.dos) lines.push(`- ${d}`);
    lines.push('');
  }

  if (profile.donts?.length) {
    lines.push("## Don'ts");
    for (const d of profile.donts) lines.push(`- ${d}`);
  }

  return lines.join('\n').trim();
}

/**
 * POST /api/brand-voice/extract
 * Body: { brand_id }
 * Loads site_profiles.site_summary, asks Claude to extract a voice profile,
 * returns the structured profile + markdown. Does NOT save — the client
 * calls supabase directly to update brand_settings.tone_and_voice after
 * showing a preview.
 */
export async function POST(request: Request) {
  try {
    const { brand_id } = await request.json();

    if (!brand_id) {
      return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch brand name
    const { data: brand } = await supabase
      .from('brands')
      .select('name')
      .eq('id', brand_id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Fetch site summary
    const { data: profile } = await supabase
      .from('site_profiles')
      .select('site_summary')
      .eq('brand_id', brand_id)
      .maybeSingle();

    if (!profile?.site_summary) {
      return NextResponse.json(
        {
          error:
            'No site summary available. Run the site profile scrape first, then try again.',
        },
        { status: 400 }
      );
    }

    // Call Claude
    const anthropic = getAnthropicClient();
    const prompt = buildVoiceExtractionPrompt(brand.name, profile.site_summary);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON (with fallback to extract from markdown fences)
    let voice: VoiceProfile;
    try {
      voice = JSON.parse(text.trim());
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
      try {
        voice = JSON.parse(match[0]);
      } catch {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
    }

    const markdown = toMarkdown(voice);

    return NextResponse.json({ voice, markdown });
  } catch (err) {
    console.error('Voice extraction error:', err);

    const anthropicError = handleAnthropicError(err);
    if (anthropicError) {
      return NextResponse.json(
        { error: anthropicError.error, code: anthropicError.code },
        { status: anthropicError.status }
      );
    }

    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
