import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getStrikingDistance,
  getCompetitorGap,
  getUnownedOpportunities,
  KeywordOpportunity,
} from '@/lib/dataforseo/client';
import { handleDataForSEOError } from '@/lib/dataforseo/errors';

function dedupe(
  striking: KeywordOpportunity[],
  gaps: KeywordOpportunity[],
  unowned: KeywordOpportunity[]
): {
  striking_distance: KeywordOpportunity[];
  competitor_gaps: KeywordOpportunity[];
  unowned: KeywordOpportunity[];
} {
  const seen = new Set<string>();

  const deduped = (arr: KeywordOpportunity[]) =>
    arr.filter((k) => {
      const key = k.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Priority: striking > competitor_gaps > unowned
  const strikingOut = deduped(striking);
  const gapsOut = deduped(gaps);
  const unownedOut = deduped(unowned);

  return {
    striking_distance: strikingOut,
    competitor_gaps: gapsOut,
    unowned: unownedOut,
  };
}

/**
 * POST /api/opportunities/discover
 * Body: { brand_id }
 * Calls DataForSEO and returns keyword opportunities grouped by type.
 * Does NOT save to DB — the client saves the ones the user selects.
 */
export async function POST(request: Request) {
  try {
    const { brand_id } = await request.json();
    if (!brand_id) {
      return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const [{ data: settings }, { data: competitors }] = await Promise.all([
      supabase
        .from('brand_settings')
        .select('site_url')
        .eq('brand_id', brand_id)
        .single(),
      supabase
        .from('competitors')
        .select('url')
        .eq('brand_id', brand_id),
    ]);

    if (!settings?.site_url) {
      return NextResponse.json(
        { error: 'No site URL configured. Set your site URL in Brand Settings first.' },
        { status: 400 }
      );
    }

    const siteUrl = settings.site_url;
    const competitorUrls = (competitors ?? []).map((c) => c.url);

    // Run all DataForSEO calls in parallel, capturing errors
    const warnings: string[] = [];

    const catchWith = <T,>(
      label: string,
      promise: Promise<T>,
      fallback: T
    ): Promise<T> =>
      promise.catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[discover] ${label} failed:`, msg);
        warnings.push(`${label}: ${msg}`);
        return fallback;
      });

    const allResults = await Promise.all([
      catchWith('Striking distance', getStrikingDistance(siteUrl), [] as KeywordOpportunity[]),
      ...competitorUrls.map((url) =>
        catchWith(`Competitor gap (${url})`, getCompetitorGap(siteUrl, url), [] as KeywordOpportunity[])
      ),
      catchWith('Unowned topics', getUnownedOpportunities(siteUrl), [] as KeywordOpportunity[]),
    ]);

    const striking = allResults[0];
    const unowned = allResults[allResults.length - 1];
    const gapResults = allResults.slice(1, allResults.length - 1);

    // Merge all competitor gap results and deduplicate within the category
    const competitorGapsSeen = new Set<string>();
    const mergedGaps: KeywordOpportunity[] = [];
    for (const gapList of gapResults) {
      for (const kw of gapList) {
        const key = kw.keyword.toLowerCase();
        if (!competitorGapsSeen.has(key)) {
          competitorGapsSeen.add(key);
          mergedGaps.push(kw);
        }
      }
    }
    mergedGaps.sort((a, b) => b.volume - a.volume);

    const result = dedupe(striking, mergedGaps, unowned);

    return NextResponse.json({
      ...result,
      competitors_checked: competitorUrls.length,
      warnings,
    });
  } catch (err) {
    console.error('Opportunity discovery error:', err);

    const dfsError = handleDataForSEOError(err);
    if (dfsError) {
      return NextResponse.json(
        { error: dfsError.error },
        { status: dfsError.status }
      );
    }

    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
