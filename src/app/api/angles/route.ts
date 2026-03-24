import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildAnglesPrompt } from '@/lib/claude/prompts';

export async function POST(request: Request) {
  try {
    const { focus_keyword, user_notes, brand_id } = await request.json();

    if (!focus_keyword || !brand_id) {
      return NextResponse.json(
        { error: 'focus_keyword and brand_id are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch brand settings
    const { data: settings, error: settingsError } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('brand_id', brand_id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Brand settings not found' },
        { status: 404 }
      );
    }

    // Build prompt and call Claude
    const prompt = buildAnglesPrompt(settings, focus_keyword, user_notes);
    const anthropic = getAnthropicClient();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON response
    let angles;
    try {
      angles = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        angles = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
    }

    // Create article record
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        brand_id,
        focus_keyword,
        user_notes: user_notes || null,
      })
      .select('id')
      .single();

    if (articleError) {
      return NextResponse.json({ error: articleError.message }, { status: 500 });
    }

    // Create angle records
    const angleRecords = angles.map((angle: { angle_number: number; title: string; description: string; article_type: string }) => ({
      article_id: article.id,
      angle_number: angle.angle_number,
      title: angle.title,
      description: angle.description,
      article_type: angle.article_type,
    }));

    const { data: savedAngles, error: anglesError } = await supabase
      .from('article_angles')
      .insert(angleRecords)
      .select('id, angle_number, title, description, article_type');

    if (anglesError) {
      return NextResponse.json({ error: anglesError.message }, { status: 500 });
    }

    return NextResponse.json({
      article_id: article.id,
      angles: savedAngles,
    });
  } catch (err) {
    console.error('Angles API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
