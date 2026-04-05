/**
 * HUD Element: Session
 *
 * Display session duration with color gradient.
 */

import { color, sessionGradientColor } from '../colors.js';

export interface SessionElementOptions {
  sessionStartTimestamp?: string;
}

/**
 * Calculate session duration in minutes.
 */
function calculateDurationMinutes(startTimestamp?: string): number {
  if (!startTimestamp) return 0;
  const start = new Date(startTimestamp);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 60000);
}

/**
 * Format duration as human-readable string.
 */
function formatDuration(minutes: number): string {
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
 * Render session element with color gradient.
 * Format: session:15m
 */
export function renderSessionElement(options: SessionElementOptions): string {
  const { sessionStartTimestamp } = options;
  const minutes = calculateDurationMinutes(sessionStartTimestamp);
  const duration = formatDuration(minutes);
  const colorName = sessionGradientColor(minutes);

  return color(`session:${duration}`, colorName);
}

/**
 * Get session duration in minutes (exported for context).
 */
export function getSessionDurationMinutes(sessionStartTimestamp?: string): number {
  return calculateDurationMinutes(sessionStartTimestamp);
}
