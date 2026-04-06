/**
 * HUD Renderer
 *
 * Composes two-line statusline output.
 */

import path from 'node:path';
import type { PonyHudContext, PonyConfig } from '../types.js';
import {
  renderTasksElement,
  renderSessionElement,
  renderAgentsElement,
  renderToolsElement,
  renderSkillsElement,
  renderTokensElement,
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
 * Render Pony label with version.
 */
function renderPonyLabel(): string {
  return bold(color('[Pony 0.0.1]', 'cyan'));
}

/**
 * Render location element: pathname:branchname
 * pathname=blue, :=gray, branchname=green
 */
function renderLocation(cwd: string, branchName: string | null): string {
  const pathname = path.basename(cwd);
  const coloredPath = color(pathname, 'blue');
  const coloredColon = color(':', 'brightBlack');
  const coloredBranch = branchName ? color(branchName, 'green') : '';
  return `${coloredPath}${coloredColon}${coloredBranch}`;
}

/**
 * Render the complete HUD statusline (two lines).
 * Line 1: [Pony] | location | session | ctx | tokens | agents | tools | skills
 * Line 2: tasks: X total | pending? | running? | completed?
 */
export function render(context: PonyHudContext, config: PonyConfig): string {
  const enabledElements = config.hud.elements;

  // ─── Line 1: Status Bar ──────────────────────────────────────────────────────

  const line1Parts: string[] = [];

  // Pony label (常驻显示，不受配置控制)
  line1Parts.push(renderPonyLabel());

  // Location (常驻显示)
  line1Parts.push(renderLocation(context.cwd, context.branchName));

  // Session (conditional)
  if (enabledElements.sessionDuration) {
    line1Parts.push(
      renderSessionElement({
        sessionStartTimestamp: context.hudState?.sessionStartTimestamp,
      }),
    );
  }

  // Context (conditional)
  if (enabledElements.context) {
    line1Parts.push(renderContext(context.contextPercent));
  }

  // Tokens (conditional - 放在 ctx 后面)
  if (enabledElements.tokens) {
    const tokensElement = renderTokensElement({
      inputTokens: context.inputTokens,
      outputTokens: context.outputTokens,
      cacheCreationTokens: context.cacheCreationTokens,
      cacheReadTokens: context.cacheReadTokens,
    });
    if (tokensElement) {
      line1Parts.push(tokensElement);
    }
  }

  // Agents (if enabled AND > 0)
  if (enabledElements.agents) {
    const agentsElement = renderAgentsElement({ count: context.activeAgentsCount });
    if (agentsElement) {
      line1Parts.push(agentsElement);
    }
  }

  // Tools (conditional - show if count > 0)
  const toolsElement = renderToolsElement({ count: context.activeToolsCount });
  if (toolsElement) {
    line1Parts.push(toolsElement);
  }

  // Skills (conditional - show if count > 0)
  const skillsElement = renderSkillsElement({ count: context.activeSkillsCount });
  if (skillsElement) {
    line1Parts.push(skillsElement);
  }

  const line1 = line1Parts.join(' | ');

  // ─── Line 2: Tasks ────────────────────────────────────────────────────────────

  let line2 = '';
  if (enabledElements.tasks) {
    line2 = renderTasksElement({ summary: context.taskSummary });
  }

  // Return appropriate output based on what's enabled
  if (line1Parts.length === 0 && !line2) {
    return ''; // Nothing to display
  }

  if (!line2) {
    return line1; // Only line 1
  }

  return `${line1}\n${line2}`;
}
