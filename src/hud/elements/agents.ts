/**
 * HUD Element: Agents
 *
 * Display active agent count with color gradient.
 * Returns null if count is 0 (element should be hidden).
 */

import { color, agentsGradientColor } from '../colors.js';

export interface AgentsElementOptions {
  count: number;
}

/**
 * Render agents element with color gradient.
 * Returns null if count is 0.
 * Format: agents:2
 */
export function renderAgentsElement(options: AgentsElementOptions): string | null {
  const { count } = options;

  if (count === 0) {
    return null;
  }

  const colorName = agentsGradientColor(count);
  if (!colorName) return null;

  return color(`agents:${count}`, colorName);
}
