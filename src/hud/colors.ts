/**
 * ANSI Color Utilities for HUD
 */

/**
 * ANSI escape codes for colors and styles.
 */
export const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',

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
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

type ColorName = keyof typeof ansi;

/**
 * Check if output should be colorized.
 */
function shouldColorize(): boolean {
  // Check for NO_COLOR env var
  if (process.env.NO_COLOR) return false;
  // Force color for HUD (Claude Code statusline supports ANSI)
  return true;
}

/**
 * Apply color to text.
 */
export function color(text: string, colorName: ColorName): string {
  if (!shouldColorize()) return text;
  const code = ansi[colorName];
  if (!code) return text;
  return `${code}${text}${ansi.reset}`;
}

/**
 * Dim text (lower intensity).
 */
export function dim(text: string): string {
  return color(text, 'dim');
}

/**
 * Make text bold.
 */
export function bold(text: string): string {
  return color(text, 'bold');
}

/**
 * Color shortcuts for common use cases.
 */
export const colors = {
  success: (text: string) => color(text, 'green'),
  warning: (text: string) => color(text, 'yellow'),
  error: (text: string) => color(text, 'red'),
  info: (text: string) => color(text, 'cyan'),
  muted: (text: string) => color(text, 'brightBlack'),
  highlight: (text: string) => color(text, 'brightCyan'),
  label: (text: string) => color(text, 'brightWhite'),
};

/**
 * Status-based color selection.
 */
export function statusColor(status: string): ColorName {
  switch (status) {
    case 'completed':
      return 'green';
    case 'running':
      return 'cyan';
    case 'cancelled':
      return 'brightBlack';
    case 'pending':
    default:
      return 'yellow';
  }
}

/**
 * Priority-based color selection.
 */
export function priorityColor(priority: string): ColorName {
  switch (priority) {
    case 'high':
      return 'red';
    case 'low':
      return 'brightBlack';
    case 'medium':
    default:
      return 'yellow';
  }
}

// ─── 6-Level Color Gradient Functions ──────────────────────────────────────────

/**
 * Session duration color gradient (6 levels).
 * 0m: gray, 1-15m: green, 15-30m: blue, 30-45m: yellow, 45-60m: magenta, >60m: red
 */
export function sessionGradientColor(minutes: number): ColorName {
  if (minutes === 0) return 'brightBlack';
  if (minutes > 60) return 'red';
  if (minutes > 45) return 'magenta';
  if (minutes > 30) return 'yellow';
  if (minutes > 15) return 'blue';
  return 'green';
}

/**
 * Context usage color gradient (6 levels).
 * 0%: black, 1-35%: green, 35-50%: blue, 50-65%: yellow, 65-80%: magenta, >80%: red
 */
export function ctxGradientColor(percent: number): ColorName {
  if (percent === 0) return 'brightBlack';
  if (percent > 80) return 'red';
  if (percent > 65) return 'magenta';
  if (percent > 50) return 'yellow';
  if (percent > 35) return 'blue';
  return 'green';
}

/**
 * Agents count color gradient (5 levels).
 * 0: hidden, 1: green, 2: blue, 3: yellow, 4: magenta, >=5: red
 */
export function agentsGradientColor(count: number): ColorName | null {
  if (count === 0) return null;
  if (count >= 5) return 'red';
  if (count >= 4) return 'magenta';
  if (count >= 3) return 'yellow';
  if (count >= 2) return 'blue';
  return 'green';
}

/**
 * Tools count color gradient (5 levels).
 * 0: hidden, 1-9: green, 10-49: blue, 50-99: yellow, 100-199: magenta, >=200: red
 */
export function toolsGradientColor(count: number): ColorName | null {
  if (count === 0) return null;
  if (count >= 200) return 'red';
  if (count >= 100) return 'magenta';
  if (count >= 50) return 'yellow';
  if (count >= 10) return 'blue';
  return 'green';
}
