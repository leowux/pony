/**
 * HUD Element: Skills
 *
 * Display skill invocation count.
 * Returns null if count is 0 (element should be hidden).
 */

import { color } from '../colors.js';

export interface SkillsElementOptions {
  count: number;
}

/**
 * Render skills element.
 * Returns null if count is 0.
 * Format: skills:2
 */
export function renderSkillsElement(options: SkillsElementOptions): string | null {
  const { count } = options;

  if (count === 0) {
    return null;
  }

  return color(`skills:${count}`, 'cyan');
}
