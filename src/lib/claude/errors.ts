import Anthropic from '@anthropic-ai/sdk';

interface ApiErrorResponse {
  error: string;
  code: string;
  status: number;
}

/**
 * Maps Anthropic SDK errors to user-friendly responses.
 * Returns null if the error is not an Anthropic API error.
 */
export function handleAnthropicError(err: unknown): ApiErrorResponse | null {
  if (err instanceof Anthropic.APIError) {
    switch (err.status) {
      case 401:
        return {
          error: 'Invalid API key. Check your ANTHROPIC_API_KEY in environment variables.',
          code: 'auth_error',
          status: 401,
        };
      case 402:
        return {
          error: 'Your Anthropic API credits have run out. Please top up at console.anthropic.com/settings/billing.',
          code: 'billing_error',
          status: 402,
        };
      case 429:
        return {
          error: 'Too many requests. Please wait a moment and try again.',
          code: 'rate_limit_error',
          status: 429,
        };
      case 529:
        return {
          error: 'Claude is temporarily overloaded. Please try again in a few minutes.',
          code: 'overloaded_error',
          status: 529,
        };
      case 500:
        return {
          error: 'Claude API encountered an internal error. Please try again.',
          code: 'api_error',
          status: 500,
        };
      default:
        return {
          error: `Claude API error: ${err.message}`,
          code: 'api_error',
          status: err.status,
        };
    }
  }

  return null;
}
