import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const { brand_id, change_request, current_settings } = await request.json();

    if (!brand_id || !change_request) {
      return NextResponse.json({ error: 'brand_id and change_request are required' }, { status: 400 });
    }

    // Build a prompt that asks Claude to interpret the change and return updated fields
    const settingsSnapshot = {
      tone_and_voice: current_settings.tone_and_voice || '',
      target_audience: current_settings.target_audience || '',
      brand_story: current_settings.brand_story || '',
      unique_selling_points: current_settings.unique_selling_points || '',
      content_guidelines: current_settings.content_guidelines || '',
      things_to_always_include: current_settings.things_to_always_include || '',
      things_to_never_include: current_settings.things_to_never_include || '',
      default_word_count_min: current_settings.default_word_count_min || 800,
      default_word_count_max: current_settings.default_word_count_max || 1200,
      content_categories: current_settings.content_categories || [],
      content_tags: current_settings.content_tags || [],
      site_name: current_settings.site_name || '',
      site_url: current_settings.site_url || '',
      meta_description_style: current_settings.meta_description_style || '',
      image_prompt_style: current_settings.image_prompt_style || '',
      wp_site_url: current_settings.wp_site_url || '',
      wp_username: current_settings.wp_username || '',
      wp_app_password: current_settings.wp_app_password || '',
    };

    const prompt = `You are a settings update assistant. The user wants to modify their brand settings.

CURRENT SETTINGS:
${JSON.stringify(settingsSnapshot, null, 2)}

USER'S CHANGE REQUEST:
"${change_request}"

TASK:
Return a JSON object containing ONLY the fields that need to be updated, with their new values.
- For text fields, if the user wants to ADD something to an existing value, append it to the existing text (don't replace it unless they explicitly say to replace/change it).
- For array fields like content_categories and content_tags, return the full updated array.
- For number fields, return the new number.
- Do NOT include fields that aren't changing.
- If the user mentions passwords or credentials, update them exactly as provided.

Respond ONLY with a valid JSON object. No preamble, no markdown fences.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let updated_settings: Record<string, unknown>;
    try {
      updated_settings = JSON.parse(text.trim());
    } catch {
      // Try to extract JSON from markdown fences or surrounding text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          updated_settings = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }

    return NextResponse.json({ updated_settings });
  } catch (err) {
    console.error('Brand settings update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
