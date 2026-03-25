import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildRedoAnglesPrompt } from '@/lib/claude/prompts';
import { handleAnthropicError } from '@/lib/claude/errors';

export async function POST(request: Request) {
  try {
    const { article_id, feedback } = await request.json();

    if (!article_id || !feedback) {
      return NextResponse.json(
        { error: 'article_id and feedback are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('focus_keyword, user_notes, brand_id')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Fetch brand settings
    const { data: settings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('brand_id', article.brand_id)
      .single();

    if (!settings) {
      return NextResponse.json({ error: 'Brand settings not found' }, { status: 404 });
    }

    // Fetch previous angles and get max redo_round
    const { data: prevAngles } = await supabase
      .from('article_angles')
      .select('title, description, article_type, redo_round')
      .eq('article_id', article_id)
      .order('redo_round', { ascending: false });

    const maxRound = prevAngles?.[0]?.redo_round ?? 1;

    // Build prompt and call Claude
    const prompt = buildRedoAnglesPrompt(
      settings,
      article.focus_keyword,
      article.user_notes,
      prevAngles ?? [],
      feedback
    );

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let angles;
    try {
      angles = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        angles = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }

    // Save new angles
    const angleRecords = angles.map((angle: { angle_number: number; title: string; description: string; article_type: string }) => ({
      article_id,
      angle_number: angle.angle_number,
      title: angle.title,
      description: angle.description,
      article_type: angle.article_type,
      redo_round: maxRound + 1,
    }));

    const { data: savedAngles, error: anglesError } = await supabase
      .from('article_angles')
      .insert(angleRecords)
      .select('id, angle_number, title, description, article_type, redo_round');

    if (anglesError) {
      return NextResponse.json({ error: anglesError.message }, { status: 500 });
    }

    return NextResponse.json({
      article_id,
      angles: savedAngles,
    });
  } catch (err) {
    console.error('Redo angles API error:', err);

    const anthropicError = handleAnthropicError(err);
    if (anthropicError) {
      return NextResponse.json(
        { error: anthropicError.error, code: anthropicError.code },
        { status: anthropicError.status }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
