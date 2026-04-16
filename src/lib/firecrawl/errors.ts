interface ApiErrorResponse {
  error: string;
  code: string;
  status: number;
}

export class FirecrawlError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'FirecrawlError';
  }
}

/**
 * Maps Firecrawl errors to user-friendly responses.
 * Returns null if the error is not a FirecrawlError.
 */
export function handleFirecrawlError(err: unknown): ApiErrorResponse | null {
  if (!(err instanceof FirecrawlError)) return null;

  switch (err.status) {
    case 401:
      return {
        error: 'Invalid Firecrawl API key. Check FIRECRAWL_API_KEY in environment variables.',
        code: 'firecrawl_auth_error',
        status: 401,
      };
    case 402:
      return {
        error: 'Firecrawl credits exhausted. Top up at firecrawl.dev.',
        code: 'firecrawl_billing_error',
        status: 402,
      };
    case 429:
      return {
        error: 'Firecrawl rate limit hit. Wait a moment and try again.',
        code: 'firecrawl_rate_limit_error',
        status: 429,
      };
    case 408:
      return {
        error: 'Firecrawl request timed out. The site may be slow or blocking crawlers.',
        code: 'firecrawl_timeout_error',
        status: 408,
      };
    default:
      return {
        error: `Firecrawl error: ${err.message}`,
        code: 'firecrawl_error',
        status: err.status || 500,
      };
  }
}
