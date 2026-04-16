import { FirecrawlError } from './errors';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev';

function apiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new FirecrawlError(500, 'FIRECRAWL_API_KEY is not configured.');
  }
  return key;
}

async function firecrawlFetch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${FIRECRAWL_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const errBody = await response.json();
      message = errBody.error || errBody.message || message;
    } catch {
      // non-JSON error body
    }
    throw new FirecrawlError(response.status, message);
  }

  return (await response.json()) as T;
}

interface MapResponse {
  success: boolean;
  links?: string[];
  error?: string;
}

interface ScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

/**
 * Map a domain and return its URL list.
 * https://docs.firecrawl.dev/api-reference/endpoint/map
 */
export async function mapSite(url: string, limit = 500): Promise<string[]> {
  const result = await firecrawlFetch<MapResponse>('/v1/map', { url, limit });
  if (!result.success) {
    throw new FirecrawlError(500, result.error || 'Map failed');
  }
  return result.links || [];
}

/**
 * Scrape a single URL as markdown (main content only).
 * https://docs.firecrawl.dev/api-reference/endpoint/scrape
 */
export async function scrapeUrl(url: string): Promise<{
  markdown: string;
  title?: string;
  description?: string;
}> {
  const result = await firecrawlFetch<ScrapeResponse>('/v1/scrape', {
    url,
    formats: ['markdown'],
    onlyMainContent: true,
  });
  if (!result.success || !result.data) {
    throw new FirecrawlError(500, result.error || 'Scrape failed');
  }
  return {
    markdown: result.data.markdown || '',
    title: result.data.metadata?.title,
    description: result.data.metadata?.description,
  };
}

/**
 * Scrape multiple URLs in parallel. Failures are swallowed so one bad page
 * doesn't kill the whole batch. Returns only successful scrapes.
 */
export async function scrapeUrls(urls: string[]): Promise<
  Array<{ url: string; markdown: string; title?: string; description?: string }>
> {
  const results = await Promise.allSettled(
    urls.map(async (url) => ({
      url,
      ...(await scrapeUrl(url)),
    }))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{
        url: string;
        markdown: string;
        title?: string;
        description?: string;
      }> => r.status === 'fulfilled'
    )
    .map((r) => r.value);
}
