/**
 * Shared Utilities
 */

import { existsSync, readFileSync } from 'fs';

/**
 * Read JSON file safely, returning null if not found or malformed.
 */
export function readJsonFile<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Format duration in minutes to human-readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h${mins}m`;
}

/**
 * Calculate context percentage from stdin data.
 */
export function calculateContextPercent(stdin: {
  context_window?: { used: number; total: number };
}): number {
  if (!stdin?.context_window) return 0;
  const { used, total } = stdin.context_window;
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * Generate a session ID from a transcript path.
 */
export function extractSessionId(transcriptPath: string | undefined): string | null {
  if (!transcriptPath) return null;
  const match = transcriptPath.match(/([0-9a-f-]{36})(?:\.jsonl)?$/i);
  return match ? match[1] : null;
}

/**
 * ANSI color codes for terminal output.
 */
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
};

/**
 * Colorize text if terminal supports it.
 */
export function colorize(text: string, color: keyof typeof colors): string {
  // Check if stdout is a TTY
  if (!process.stdout.isTTY) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
}
