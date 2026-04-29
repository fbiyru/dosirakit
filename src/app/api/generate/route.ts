import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildArticlePrompt, buildSystemPrompt, BriefContext } from '@/lib/claude/prompts';
import { handleAnthropicError } from '@/lib/claude/errors';
import { scanForViolations, buildFixPrompt } from '@/lib/claude/validate-article';

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

    // Fetch brand settings (and brief if linked to an opportunity)
    const [{ data: settings }, briefResult] = await Promise.all([
      supabase
        .from('brand_settings')
        .select('*')
        .eq('brand_id', article.brand_id)
        .single(),
      article.opportunity_id
        ? supabase
            .from('briefs')
            .select('brief_content')
            .eq('opportunity_id', article.opportunity_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Brand settings not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const brief = briefResult.data?.brief_content as BriefContext | undefined;

    // Build prompt
    const systemPrompt = buildSystemPrompt(settings);
    const prompt = buildArticlePrompt(settings, angle, article, brief);

    // Stream response from Claude
    const anthropic = getAnthropicClient();

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
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
            // Post-generation validation: scan for AI writing markers
            if (parsed.body) {
              const { violations, count } = scanForViolations(parsed.body);
              if (count > 0) {
                console.log(`Found ${count} AI writing violation(s). Running fix pass...`);
                try {
                  const fixPrompt = buildFixPrompt(parsed.body, violations);
                  const fixResponse = await anthropic.messages.create({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: fixPrompt }],
                  });

                  const fixedBody = fixResponse.content[0].type === 'text'
                    ? fixResponse.content[0].text
                    : null;

                  if (fixedBody && fixedBody.length > 100) {
                    parsed.body = fixedBody;
                  }
                } catch (fixErr) {
                  // If the fix call fails, proceed with the original body
                  console.error('Fix pass failed, using original:', fixErr);
                }
              }
            }

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
              image_prompt: parsed.image_prompt || null,
              image_prompt_pinterest: parsed.image_prompt_pinterest || null,
              image_prompt_social: parsed.image_prompt_social || null,
              image_filename: parsed.image_filename || null,
              image_alt_text: parsed.image_alt_text || null,
              image_meta_description: parsed.image_meta_description || null,
              image_pinterest_filename: parsed.image_pinterest_filename || null,
              image_pinterest_alt_text: parsed.image_pinterest_alt_text || null,
              image_pinterest_meta_description: parsed.image_pinterest_meta_description || null,
              image_social_filename: parsed.image_social_filename || null,
              image_social_alt_text: parsed.image_social_alt_text || null,
              image_social_meta_description: parsed.image_social_meta_description || null,
              word_count: wordCount,
            });
          }

          controller.close();
        } catch (err) {
          // Send error info as a JSON chunk so the client can detect it
          const anthropicError = handleAnthropicError(err);
          if (anthropicError) {
            const errorChunk = `\n<!--STREAM_ERROR:${JSON.stringify({ error: anthropicError.error, code: anthropicError.code })}-->`;
            controller.enqueue(new TextEncoder().encode(errorChunk));
          }
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

    const anthropicError = handleAnthropicError(err);
    if (anthropicError) {
      return new Response(
        JSON.stringify({ error: anthropicError.error, code: anthropicError.code }),
        { status: anthropicError.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
