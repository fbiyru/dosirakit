import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { publishToWordPress } from '@/lib/wordpress/api';

export async function POST(request: Request) {
  try {
    const { article_id } = await request.json();

    if (!article_id) {
      return NextResponse.json({ error: 'article_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch article content
    const { data: content } = await supabase
      .from('article_content')
      .select('*')
      .eq('article_id', article_id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!content) {
      return NextResponse.json({ error: 'Article content not found' }, { status: 404 });
    }

    // Fetch article for brand_id, focus keyword, and linked opportunity
    const { data: article } = await supabase
      .from('articles')
      .select('brand_id, focus_keyword, opportunity_id')
      .eq('id', article_id)
      .single();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Fetch WP credentials from brand settings
    const { data: settings } = await supabase
      .from('brand_settings')
      .select('wp_site_url, wp_username, wp_app_password')
      .eq('brand_id', article.brand_id)
      .single();

    if (!settings?.wp_site_url || !settings?.wp_username || !settings?.wp_app_password) {
      return NextResponse.json(
        { error: 'WordPress credentials not configured' },
        { status: 400 }
      );
    }

    // Publish to WordPress
    const result = await publishToWordPress(
      {
        wp_site_url: settings.wp_site_url,
        wp_username: settings.wp_username,
        wp_app_password: settings.wp_app_password,
      },
      {
        title: content.title,
        slug: content.slug,
        body: content.body,
        category: content.category,
        tags: content.tags,
        meta_title: content.meta_title,
        meta_description: content.meta_description,
        focus_keyword: article.focus_keyword,
      }
    );

    // Update article status (and linked opportunity if any)
    await Promise.all([
      supabase
        .from('articles')
        .update({
          status: 'published',
          wp_post_id: result.post_id,
          wp_post_url: result.post_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', article_id),
      article?.opportunity_id
        ? supabase
            .from('opportunities')
            .update({
              status: 'published',
              wordpress_url: result.post_url,
            })
            .eq('id', article.opportunity_id)
        : Promise.resolve(),
    ]);

    return NextResponse.json({
      post_id: result.post_id,
      post_url: result.post_url,
    });
  } catch (err) {
    console.error('WordPress API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
