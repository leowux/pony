/**
 * HUD Renderer
 *
 * Composes two-line statusline output.
 */

import type { PonyHudContext, PonyConfig } from '../types.js';
import {
  renderTasksElement,
  renderSessionElement,
  renderAgentsElement,
  renderToolsElement,
  renderSkillsElement,
} from './elements/index.js';
import { color, bold, ctxGradientColor } from './colors.js';

/**
 * Render context percentage with color gradient.
 */
function renderContext(percent: number): string {
  const colorName = ctxGradientColor(percent);
  return color(`ctx:${percent}%`, colorName);
}

/**
 * Render Pony label.
 */
function renderPonyLabel(): string {
  return bold(color('[Pony]', 'cyan'));
}

/**
 * Render the complete HUD statusline (two lines).
 * Line 1: [Pony] | session | ctx | agents? | tools? | skills?
 * Line 2: tasks: X total | pending? | running? | completed?
 */
export function render(context: PonyHudContext, _config: PonyConfig): string {
  // ─── Line 1: Status Bar ──────────────────────────────────────────────────────

  const line1Parts: string[] = [];

  // Pony label (always)
  line1Parts.push(renderPonyLabel());

  // Session (always)
  line1Parts.push(
    renderSessionElement({
      sessionStartTimestamp: context.hudState?.sessionStartTimestamp,
    }),
  );

  // Context (always)
  line1Parts.push(renderContext(context.contextPercent));

  // Agents (if > 0)
  const agentsElement = renderAgentsElement({ count: context.activeAgentsCount });
  if (agentsElement) {
    line1Parts.push(agentsElement);
  }

  // Tools (if > 0)
  const toolsElement = renderToolsElement({ count: context.activeToolsCount });
  if (toolsElement) {
    line1Parts.push(toolsElement);
  }

  // Skills (if > 0)
  const skillsElement = renderSkillsElement({ count: context.activeSkillsCount });
  if (skillsElement) {
    line1Parts.push(skillsElement);
  }

  const line1 = line1Parts.join(' | ');

  // ─── Line 2: Tasks ────────────────────────────────────────────────────────────

  const line2 = renderTasksElement({ summary: context.taskSummary });

  return `${line1}\n${line2}`;
}
