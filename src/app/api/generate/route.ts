import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildArticlePrompt } from '@/lib/claude/prompts';

export async function POST(request: Request) {
  try {
    const { article_id, angle_id } = await request.json();

    if (!article_id || !angle_id) {
      return new Response(
        JSON.stringify({ error: 'article_id and angle_id are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch article
    const { data: article } = await supabase
      .from('articles')
      .select('*')
      .eq('id', article_id)
      .single();

    if (!article) {
      return new Response(
        JSON.stringify({ error: 'Article not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch angle
    const { data: angle } = await supabase
      .from('article_angles')
      .select('*')
      .eq('id', angle_id)
      .single();

    if (!angle) {
      return new Response(
        JSON.stringify({ error: 'Angle not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand settings
    const { data: settings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('brand_id', article.brand_id)
      .single();

    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Brand settings not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt
    const prompt = buildArticlePrompt(settings, angle, article);

    // Stream response from Claude
    const anthropic = getAnthropicClient();

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    let fullText = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const text = event.delta.text;
              fullText += text;
              controller.enqueue(new TextEncoder().encode(text));
            }
          }

          // Parse the complete response and save to DB
          let parsed;
          try {
            parsed = JSON.parse(fullText);
          } catch {
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            }
          }

          if (parsed) {
            const wordCount = parsed.body
              ? parsed.body.split(/\s+/).filter(Boolean).length
              : 0;

            await supabase.from('article_content').insert({
              article_id,
              angle_id,
              title: parsed.title,
              slug: parsed.slug,
              body: parsed.body,
              meta_title: parsed.meta_title,
              meta_description: parsed.meta_description,
              category: parsed.category,
              tags: parsed.tags,
              image_prompt: parsed.image_prompt,
              word_count: wordCount,
            });
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    console.error('Generate API error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
