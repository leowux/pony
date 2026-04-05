/**
 * stdin Parsing Utilities
 *
 * Parse JSON data from Claude Code stdin.
 */

import type { PonyStdinData } from '../types.js';

/**
 * Read stdin from Claude Code.
 * Claude Code passes JSON data via stdin to the HUD.
 */
export async function readStdin(): Promise<PonyStdinData | null> {
  try {
    // Check if stdin has data
    if (process.stdin.isTTY) {
      return null;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }

    const raw = Buffer.concat(chunks).toString('utf-8').trim();

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PonyStdinData;
  } catch {
    // Malformed or no stdin
    return null;
  }
}

/**
 * Get context window percentage from stdin.
 * Supports both formats:
 * - used_percentage (direct percentage, preferred)
 * - used/total (legacy ratio)
 */
export function getContextPercent(stdin: PonyStdinData | null): number {
  if (!stdin?.context_window) return 0;
  const ctx = stdin.context_window;

  // Prefer used_percentage field (direct percentage)
  if (typeof ctx.used_percentage === 'number') {
    return Math.round(ctx.used_percentage);
  }

  // Fallback to used/total ratio
  const { used, total } = ctx;
  if (typeof used !== 'number' || typeof total !== 'number') return 0;
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * Get model name from stdin.
 */
export function getModelName(stdin: PonyStdinData | null): string {
  return stdin?.model || 'unknown';
}

/**
 * Get working directory from stdin.
 */
export function getCwd(stdin: PonyStdinData | null): string {
  return stdin?.cwd || process.cwd();
}

/**
 * Get transcript path from stdin.
 */
export function getTranscriptPath(stdin: PonyStdinData | null): string | null {
  return stdin?.transcript_path || null;
}

/**
 * Get session ID from stdin.
 */
export function getSessionId(stdin: PonyStdinData | null): string | null {
  return stdin?.session_id || null;
}
