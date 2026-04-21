import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildRewritePrompt, SerpCompetitorData } from '@/lib/claude/prompts';
import { handleAnthropicError } from '@/lib/claude/errors';
import { scanForViolations, buildFixPrompt } from '@/lib/claude/validate-article';
import { getSerpResults } from '@/lib/dataforseo/client';
import { scrapeUrls } from '@/lib/firecrawl/client';

/**
 * POST /api/rewrite — Phase 1: create article record, return ID.
 * Body: { brand_id, content, keyword, notes?, rewrite_source?, run_serp_analysis? }
 */
export async function POST(request: Request) {
  try {
    const { brand_id, content, keyword, notes, rewrite_source } =
      await request.json();

    if (!brand_id || !content || !keyword) {
      return NextResponse.json(
        { error: 'brand_id, content, and keyword are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: article, error: articleErr } = await supabase
      .from('articles')
      .insert({
        brand_id,
        focus_keyword: keyword,
        user_notes: notes || null,
        source_type: 'rewritten',
        original_content: content,
        rewrite_source: rewrite_source || null,
      })
      .select('id')
      .single();

    if (articleErr || !article) {
      return NextResponse.json(
        { error: articleErr?.message || 'Failed to create article' },
        { status: 500 }
      );
    }

    return NextResponse.json({ article_id: article.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/rewrite — Phase 2: run SERP analysis + Claude streaming rewrite.
 * Body: { article_id, run_serp_analysis? }
 * Returns a streaming response.
 */
export async function PUT(request: Request) {
  try {
    const { article_id, run_serp_analysis = true } = await request.json();

    if (!article_id) {
      return new Response(
        JSON.stringify({ error: 'article_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceRoleClient();

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

    // SERP analysis
    let serpData: SerpCompetitorData[] = [];
    if (run_serp_analysis) {
      try {
        const serpResults = await getSerpResults(article.focus_keyword, 10);
        const urlsToScrape = serpResults.slice(0, 5).map((r) => r.url);
        const scraped = await scrapeUrls(urlsToScrape);

        serpData = serpResults.map((result) => {
          const page = scraped.find((s) => s.url === result.url);
          let headings: string[] | undefined;
          let word_count: number | undefined;

          if (page?.markdown) {
            headings = page.markdown
              .split('\n')
              .filter((l) => l.startsWith('## ') || l.startsWith('### '))
              .map((l) => l.replace(/^#+\s*/, ''))
              .slice(0, 10);
            word_count = page.markdown.split(/\s+/).filter(Boolean).length;
          }

          return { ...result, headings, word_count };
        });
      } catch (err) {
        console.error('[rewrite] SERP analysis failed, continuing without:', err);
      }
    }

    const prompt = buildRewritePrompt(
      settings,
      article.original_content,
      article.focus_keyword,
      serpData,
      article.user_notes
    );

    const anthropic = getAnthropicClient();

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
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
            if (parsed.body) {
              const { violations, count } = scanForViolations(parsed.body);
              if (count > 0) {
                console.log(
                  `[rewrite] Found ${count} AI writing violation(s). Running fix pass...`
                );
                try {
                  const fixPrompt = buildFixPrompt(parsed.body, violations);
                  const fixResponse = await anthropic.messages.create({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: fixPrompt }],
                  });

                  const fixedBody =
                    fixResponse.content[0].type === 'text'
                      ? fixResponse.content[0].text
                      : null;

                  if (fixedBody && fixedBody.length > 100) {
                    parsed.body = fixedBody;
                  }
                } catch (fixErr) {
                  console.error(
                    '[rewrite] Fix pass failed, using original:',
                    fixErr
                  );
                }
              }
            }

            const wordCount = parsed.body
              ? parsed.body.split(/\s+/).filter(Boolean).length
              : 0;

            await supabase.from('article_content').insert({
              article_id,
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
              word_count: wordCount,
            });
          }

          controller.close();
        } catch (err) {
          const anthropicError = handleAnthropicError(err);
          if (anthropicError) {
            const errorChunk = `\n<!--STREAM_ERROR:${JSON.stringify({
              error: anthropicError.error,
              code: anthropicError.code,
            })}-->`;
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
    console.error('Rewrite streaming error:', err);

    const anthropicError = handleAnthropicError(err);
    if (anthropicError) {
      return new Response(
        JSON.stringify({
          error: anthropicError.error,
          code: anthropicError.code,
        }),
        {
          status: anthropicError.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
