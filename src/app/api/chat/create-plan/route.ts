import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildPlanExtractionPrompt, buildChatBriefPrompt } from '@/lib/claude/prompts';
import { handleAnthropicError } from '@/lib/claude/errors';

export async function POST(request: Request) {
  try {
    const { messages, brand_id } = await request.json();

    if (!brand_id || !messages?.length) {
      return NextResponse.json(
        { error: 'brand_id and messages are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const anthropic = getAnthropicClient();

    const { data: settings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('brand_id', brand_id)
      .single();

    if (!settings) {
      return NextResponse.json(
        { error: 'Brand settings not found' },
        { status: 404 }
      );
    }

    // Step 1: Extract the plan from the conversation
    const extractionMessages = [
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user' as const,
        content: buildPlanExtractionPrompt(),
      },
    ];

    const extractionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: extractionMessages,
    });

    const extractionText =
      extractionResponse.content[0].type === 'text'
        ? extractionResponse.content[0].text
        : '';

    let plan: {
      keyword: string;
      volume: number;
      kd: number;
      article_type: string;
      title_direction: string;
      angle_description: string;
      key_points: string[];
      conversation_summary: string;
    };

    try {
      plan = JSON.parse(extractionText.trim());
    } catch {
      const match = extractionText.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json(
          { error: 'Failed to extract plan from conversation' },
          { status: 500 }
        );
      }
      plan = JSON.parse(match[0]);
    }

    // Step 2: Create opportunity record
    const { data: opportunity, error: oppErr } = await supabase
      .from('opportunities')
      .insert({
        brand_id,
        keyword: plan.keyword,
        volume: plan.volume || 0,
        kd: plan.kd || 0,
        traffic_potential: Math.round((plan.volume || 0) * 0.1),
        opportunity_type: 'chat_planned',
        status: 'new',
      })
      .select('*')
      .single();

    if (oppErr || !opportunity) {
      return NextResponse.json(
        { error: oppErr?.message || 'Failed to create opportunity' },
        { status: 500 }
      );
    }

    // Step 3: Generate brief using chat context
    const [{ data: siteProfile }, { data: competitors }] = await Promise.all([
      supabase
        .from('site_profiles')
        .select('url_map')
        .eq('brand_id', brand_id)
        .maybeSingle(),
      supabase.from('competitors').select('url').eq('brand_id', brand_id),
    ]);

    const existingUrls = Array.isArray(siteProfile?.url_map)
      ? (siteProfile.url_map as string[])
      : null;
    const competitorUrls = (competitors ?? []).map((c) => c.url);

    const briefPrompt = buildChatBriefPrompt(
      settings,
      opportunity,
      existingUrls,
      competitorUrls,
      {
        title_direction: plan.title_direction,
        angle_description: plan.angle_description,
        article_type: plan.article_type,
        key_points: plan.key_points,
        conversation_summary: plan.conversation_summary,
      }
    );

    const briefResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: briefPrompt }],
    });

    const briefText =
      briefResponse.content[0].type === 'text'
        ? briefResponse.content[0].text
        : '';

    let briefContent: Record<string, unknown>;
    try {
      briefContent = JSON.parse(briefText.trim());
    } catch {
      const match = briefText.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json(
          { error: 'Failed to parse brief response' },
          { status: 500 }
        );
      }
      briefContent = JSON.parse(match[0]);
    }

    // Step 4: Save brief and update opportunity status
    const { error: briefErr } = await supabase.from('briefs').insert({
      opportunity_id: opportunity.id,
      brand_id,
      brief_content: briefContent,
    });

    if (briefErr) {
      return NextResponse.json(
        { error: briefErr.message },
        { status: 500 }
      );
    }

    await supabase
      .from('opportunities')
      .update({ status: 'briefed' })
      .eq('id', opportunity.id);

    // Step 5: Create article record
    const { data: article, error: articleErr } = await supabase
      .from('articles')
      .insert({
        brand_id,
        focus_keyword: plan.keyword,
        source_type: 'chat_planned',
        opportunity_id: opportunity.id,
      })
      .select('id')
      .single();

    if (articleErr || !article) {
      return NextResponse.json(
        { error: articleErr?.message || 'Failed to create article' },
        { status: 500 }
      );
    }

    // Step 6: Create pre-selected angle from the plan
    const { error: angleErr } = await supabase.from('article_angles').insert({
      article_id: article.id,
      angle_number: 1,
      title: plan.title_direction,
      description: plan.angle_description,
      article_type: plan.article_type,
      selected: true,
    });

    if (angleErr) {
      return NextResponse.json(
        { error: angleErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ article_id: article.id });
  } catch (err) {
    console.error('Create plan error:', err);

    const anthropicError = handleAnthropicError(err);
    if (anthropicError) {
      return NextResponse.json(
        { error: anthropicError.error, code: anthropicError.code },
        { status: anthropicError.status }
      );
    }

    const message =
      err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
