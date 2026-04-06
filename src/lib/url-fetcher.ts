/**
 * URL Fetcher Utilities
 *
 * Detect URLs and fetch content from web pages.
 * Used for requirements document fetching.
 */

// URL detection regex
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Check if text is a single URL.
 */
export function isUrl(text: string): boolean {
  const trimmed = text.trim();
  return URL_REGEX.test(trimmed) && trimmed.match(URL_REGEX)?.length === 1;
}

/**
 * Check if text contains any URLs.
 */
export function containsUrls(text: string): boolean {
  return URL_REGEX.test(text);
}

/**
 * Extract all URLs from text.
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Fetch content from a URL.
 * Uses native fetch API (Node 18+).
 */
export async function fetchUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();
    return html;
  } catch (error) {
    throw new Error(
      `Failed to fetch URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
