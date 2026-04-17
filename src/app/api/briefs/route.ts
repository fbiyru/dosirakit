import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildBriefPrompt } from '@/lib/claude/prompts';
import { handleAnthropicError } from '@/lib/claude/errors';

/**
 * GET /api/briefs?opportunity_id=xxx
 * Returns the brief for a given opportunity (if one exists).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const opportunity_id = searchParams.get('opportunity_id');
  const brand_id = searchParams.get('brand_id');

  if (!opportunity_id && !brand_id) {
    return NextResponse.json(
      { error: 'opportunity_id or brand_id is required' },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  if (opportunity_id) {
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .eq('opportunity_id', opportunity_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ brief: data });
  }

  // List all briefs for brand
  const { data, error } = await supabase
    .from('briefs')
    .select('*, opportunities(keyword, volume, kd, opportunity_type, status)')
    .eq('brand_id', brand_id!)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ briefs: data ?? [] });
}

/**
 * POST /api/briefs
 * Body: { opportunity_id }
 * Generates a content brief using Claude and saves it.
 * Also updates the opportunity status to 'briefed'.
 */
export async function POST(request: Request) {
  try {
    const { opportunity_id } = await request.json();

    if (!opportunity_id) {
      return NextResponse.json(
        { error: 'opportunity_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch the opportunity
    const { data: opportunity, error: oppErr } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .single();

    if (oppErr || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    // Fetch brand_settings, site_profiles (for URL map), and competitors in parallel
    const [
      { data: settings },
      { data: siteProfile },
      { data: competitors },
    ] = await Promise.all([
      supabase
        .from('brand_settings')
        .select('*')
        .eq('brand_id', opportunity.brand_id)
        .single(),
      supabase
        .from('site_profiles')
        .select('url_map')
        .eq('brand_id', opportunity.brand_id)
        .maybeSingle(),
      supabase
        .from('competitors')
        .select('url')
        .eq('brand_id', opportunity.brand_id),
    ]);

    if (!settings) {
      return NextResponse.json(
        { error: 'Brand settings not found. Complete onboarding first.' },
        { status: 400 }
      );
    }

    const existingUrls = Array.isArray(siteProfile?.url_map)
      ? (siteProfile.url_map as string[])
      : null;
    const competitorUrls = (competitors ?? []).map((c) => c.url);

    const prompt = buildBriefPrompt(settings, opportunity, existingUrls, competitorUrls);

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON (with fallback to extract from markdown fences)
    let briefContent: Record<string, unknown>;
    try {
      briefContent = JSON.parse(text.trim());
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
      try {
        briefContent = JSON.parse(match[0]);
      } catch {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
    }

    // Save brief
    const { data: brief, error: briefErr } = await supabase
      .from('briefs')
      .insert({
        opportunity_id,
        brand_id: opportunity.brand_id,
        brief_content: briefContent,
      })
      .select('*')
      .single();

    if (briefErr) {
      return NextResponse.json(
        { error: briefErr.message },
        { status: 500 }
      );
    }

    // Update opportunity status to 'briefed'
    await supabase
      .from('opportunities')
      .update({ status: 'briefed' })
      .eq('id', opportunity_id);

    return NextResponse.json({ brief });
  } catch (err) {
    console.error('Brief generation error:', err);

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

/**
 * PATCH /api/briefs
 * Body: { id, brief_content }
 * Updates the brief content (for user edits).
 */
export async function PATCH(request: Request) {
  try {
    const { id, brief_content } = await request.json();

    if (!id || !brief_content) {
      return NextResponse.json(
        { error: 'id and brief_content are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('briefs')
      .update({ brief_content })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
