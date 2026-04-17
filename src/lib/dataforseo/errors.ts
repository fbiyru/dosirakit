export class DataForSEOError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'DataForSEOError';
  }
}

export function handleDataForSEOError(
  err: unknown
): { error: string; status: number } | null {
  if (!(err instanceof DataForSEOError)) return null;
  const s = err.status ?? 500;
  if (s === 401) return { error: 'DataForSEO authentication failed. Check your API credentials.', status: 401 };
  if (s === 402) return { error: 'DataForSEO account has insufficient credits.', status: 402 };
  if (s === 429) return { error: 'DataForSEO rate limit exceeded. Please try again in a few minutes.', status: 429 };
  return { error: err.message || 'DataForSEO API error', status: s };
}
