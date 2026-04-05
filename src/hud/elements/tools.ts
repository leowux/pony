/**
 * HUD Element: Tools
 *
 * Display tool call count with color gradient.
 * Returns null if count is 0 (element should be hidden).
 */

import { color, toolsGradientColor } from '../colors.js';

export interface ToolsElementOptions {
  count: number;
}

/**
 * Render tools element with color gradient.
 * Returns null if count is 0.
 * Format: tools:3
 */
export function renderToolsElement(options: ToolsElementOptions): string | null {
  const { count } = options;

  if (count === 0) {
    return null;
  }

  const colorName = toolsGradientColor(count);
  if (!colorName) return null;

  return color(`tools:${count}`, colorName);
}
