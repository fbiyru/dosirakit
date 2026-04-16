import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { mapSite, scrapeUrls } from '@/lib/firecrawl/client';
import { handleFirecrawlError } from '@/lib/firecrawl/errors';

// Max characters of scraped content to persist. Keeps JSON payloads sane
// and avoids blowing up later prompts.
const MAX_SUMMARY_CHARS = 20000;

/**
 * GET /api/site-profile?brand_id=...
 * Returns the current site profile + competitors for a brand.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brand_id');

    if (!brandId) {
      return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: profile } = await supabase
      .from('site_profiles')
      .select('*')
      .eq('brand_id', brandId)
      .maybeSingle();

    const { data: competitors } = await supabase
      .from('competitors')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      profile: profile || null,
      competitors: competitors || [],
    });
  } catch (err) {
    console.error('Site profile GET error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/site-profile
 * Body: { brand_id, site_url }
 * Maps the domain via Firecrawl, scrapes homepage/about/up to 5 posts,
 * stores the result in site_profiles (one row per brand_id).
 */
export async function POST(request: Request) {
  try {
    const { brand_id, site_url } = await request.json();

    if (!brand_id || !site_url) {
      return NextResponse.json(
        { error: 'brand_id and site_url are required' },
        { status: 400 }
      );
    }

    // Normalize the URL so mapSite gets a clean origin
    let normalizedUrl: string;
    try {
      normalizedUrl = new URL(site_url).toString().replace(/\/$/, '');
    } catch {
      return NextResponse.json({ error: 'Invalid site_url' }, { status: 400 });
    }

    // 1. Map all URLs
    const urlList = await mapSite(normalizedUrl, 500);

    // 2. Pick targets to scrape: homepage + about + up to 5 posts
    const targets = pickScrapeTargets(normalizedUrl, urlList);

    // 3. Scrape in parallel (failures are skipped)
    const scraped = await scrapeUrls(targets);

    // 4. Build a concatenated site summary string (bounded)
    const summaryParts: string[] = [];
    for (const page of scraped) {
      const header = `--- ${page.title || page.url} (${page.url}) ---\n`;
      summaryParts.push(header + page.markdown);
    }
    const combined = summaryParts.join('\n\n');
    const site_summary = combined.length > MAX_SUMMARY_CHARS
      ? combined.slice(0, MAX_SUMMARY_CHARS) + '\n\n[truncated]'
      : combined;

    const supabase = createServiceRoleClient();

    // 5. Upsert (one profile per brand)
    const { data: existing } = await supabase
      .from('site_profiles')
      .select('id')
      .eq('brand_id', brand_id)
      .maybeSingle();

    const row = {
      brand_id,
      site_url: normalizedUrl,
      url_map: urlList,
      site_summary,
      last_scraped_at: new Date().toISOString(),
    };

    let profile;
    if (existing?.id) {
      const { data, error } = await supabase
        .from('site_profiles')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      profile = data;
    } else {
      const { data, error } = await supabase
        .from('site_profiles')
        .insert(row)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      profile = data;
    }

    return NextResponse.json({
      profile,
      scraped_pages: scraped.map((p) => ({ url: p.url, title: p.title })),
      mapped_count: urlList.length,
    });
  } catch (err) {
    console.error('Site profile POST error:', err);

    const fcError = handleFirecrawlError(err);
    if (fcError) {
      return NextResponse.json(
        { error: fcError.error, code: fcError.code },
        { status: fcError.status }
      );
    }

    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Heuristic: pick homepage + about + up to 5 likely blog posts from a URL list.
 */
function pickScrapeTargets(siteUrl: string, urls: string[]): string[] {
  const origin = new URL(siteUrl).origin;
  const targets: string[] = [];
  const seen = new Set<string>();

  function add(u: string) {
    if (!u || seen.has(u)) return;
    seen.add(u);
    targets.push(u);
  }

  // Homepage
  add(siteUrl);
  add(origin);

  // About page
  const aboutCandidates = urls.filter((u) => {
    const path = safePath(u);
    return /\/(about|about-us|about-me|bio)\/?$/i.test(path);
  });
  if (aboutCandidates[0]) add(aboutCandidates[0]);

  // Blog posts: paths that look like post slugs under /blog, /recipes,
  // or that are deeper than one segment and not obvious utility pages.
  const postCandidates = urls.filter((u) => {
    if (u === siteUrl || u === origin) return false;
    const path = safePath(u);
    if (!path || path === '/') return false;
    if (/^\/(category|tag|author|page|wp-|feed|contact|privacy|terms|sitemap|search)\b/i.test(path)) return false;
    // Looks like a post: has a slug segment
    return /^\/(blog|recipes|posts|articles|r|p)\/[a-z0-9-]+/i.test(path) ||
           /^\/[a-z0-9][a-z0-9-]{3,}\/?$/i.test(path);
  });

  for (const url of postCandidates.slice(0, 5)) {
    add(url);
  }

  return targets;
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}
