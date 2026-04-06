/**
 * HUD Element: Tokens
 *
 * Display output token consumption.
 */

import { color, type ColorName } from '../colors.js';

export interface TokensElementOptions {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

/**
 * Format token count as human-readable string.
 * Uses K for thousands, M for millions, B for billions.
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Get color based on output token count gradient.
 * 0: brightBlack (gray), <1K: green, <1M: blue, <1B: yellow, >1B: red
 */
function getTokenColor(outputTokens: number): ColorName {
  if (outputTokens === 0) return 'brightBlack';
  if (outputTokens < 1_000) return 'green';
  if (outputTokens < 1_000_000) return 'blue';
  if (outputTokens < 1_000_000_000) return 'yellow';
  return 'red';
}

/**
 * Render tokens element showing input (↑) and output (↓).
 * Format: tokens:↑12K ↓300K
 */
export function renderTokensElement(options: TokensElementOptions): string {
  const { inputTokens, outputTokens } = options;

  // Show gray for zero
  const outputColor = getTokenColor(outputTokens);
  const inputStr = formatTokens(inputTokens);
  const outputStr = formatTokens(outputTokens);

  return color(`tokens:↑${inputStr} ↓${outputStr}`, outputColor);
}
