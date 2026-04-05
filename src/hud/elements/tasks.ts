/**
 * HUD Element: Tasks
 *
 * Display task summary on second line.
 * Only shows statuses with count > 0.
 */

import type { TaskSummary } from '../../types.js';
import { color } from '../colors.js';

export interface TasksElementOptions {
  summary: TaskSummary;
}

/**
 * Render tasks element for second line.
 * Format: tasks: 10 total | pending 3 | running 1 | completed 6
 */
export function renderTasksElement(options: TasksElementOptions): string {
  const { summary } = options;
  const { total, completed, pending, running, cancelled } = summary;

  if (total === 0) {
    return color('tasks: 0', 'brightBlack');
  }

  const parts: string[] = [];

  // Total (always shown) - just the number
  parts.push(color(`tasks: ${total}`, 'white'));

  // Pending (yellow)
  if (pending > 0) {
    parts.push(color(`pending ${pending}`, 'yellow'));
  }

  // Running (blue)
  if (running > 0) {
    parts.push(color(`running ${running}`, 'blue'));
  }

  // Completed (green)
  if (completed > 0) {
    parts.push(color(`completed ${completed}`, 'green'));
  }

  // Cancelled (gray)
  if (cancelled > 0) {
    parts.push(color(`cancelled ${cancelled}`, 'brightBlack'));
  }

  return parts.join(' | ');
}
