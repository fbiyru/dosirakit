import { NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/claude/client';

export async function POST(request: Request) {
  try {
    const { brand_name, brand_story, target_audience } = await request.json();

    if (!brand_name) {
      return NextResponse.json(
        { error: 'brand_name is required' },
        { status: 400 }
      );
    }

    const anthropic = getAnthropicClient();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20241022',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are helping a content creator set up their blog categories.

Brand name: ${brand_name}
${brand_story ? `About: ${brand_story}` : ''}
${target_audience ? `Target audience: ${target_audience}` : ''}

Suggest 5-8 content categories that would work well for this brand. Categories should be broad enough to contain multiple articles but specific enough to be meaningful for navigation and SEO.

Respond ONLY with a valid JSON array of strings. No preamble, no markdown fences. Example: ["Category 1", "Category 2", "Category 3"]`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let categories: string[];
    try {
      categories = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        categories = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ categories });
  } catch (err) {
    console.error('Suggest categories error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
