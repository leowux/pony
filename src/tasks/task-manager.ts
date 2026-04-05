/**
 * Task Manager
 *
 * High-level business logic for task management.
 * All tasks are stored globally in ~/.pony/
 */

import type { PonyTask, PonyTaskPriority, PonyTaskStatus } from '../types.js';
import * as taskOps from './task-file-ops.js';

// Re-export for convenience
export { readAllTasks, readTask, getTaskSummary, getCurrentTask } from './task-file-ops.js';

// ─── Task Creation ────────────────────────────────────────────────────────────

export interface CreateTaskOptions {
  title: string;
  description: string;
  priority?: PonyTaskPriority;
  dependencies?: string[];
  tags?: string[];
  owner?: string;
  metadata?: Record<string, unknown>;
  projectPath?: string;
}

/**
 * Create a validated task.
 */
export function createTask(options: CreateTaskOptions): { id: string; task: PonyTask } {
  // Validate title
  if (!options.title || options.title.trim().length === 0) {
    throw new Error('Task title is required');
  }

  // Validate dependencies exist
  if (options.dependencies?.length) {
    for (const depId of options.dependencies) {
      const dep = taskOps.readTask(depId);
      if (!dep) {
        throw new Error(`Dependency task "${depId}" not found`);
      }
    }
  }

  const id = taskOps.createTask(
    {
      title: options.title.trim(),
      description: options.description?.trim() || '',
      status: 'pending',
      priority: options.priority || 'medium',
      dependencies: options.dependencies || [],
      tags: options.tags,
      owner: options.owner,
      metadata: options.metadata,
    },
    options.projectPath,
  );

  const task = taskOps.readTask(id);
  return { id, task: task! };
}

// ─── Status Transitions ───────────────────────────────────────────────────────

/**
 * Valid status transitions.
 */
const VALID_TRANSITIONS: Record<PonyTaskStatus, PonyTaskStatus[]> = {
  pending: ['running', 'cancelled'],
  running: ['completed', 'pending', 'cancelled'],
  completed: ['pending'], // Allow reopening
  cancelled: ['pending'], // Allow reactivating
};

/**
 * Transition task to a new status.
 * Validates the transition and checks dependencies.
 */
export function transitionStatus(taskId: string, newStatus: PonyTaskStatus): PonyTask | null {
  const task = taskOps.readTask(taskId);
  if (!task) return null;

  // Validate transition
  const allowedTransitions = VALID_TRANSITIONS[task.status];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${task.status} -> ${newStatus}. ` +
        `Allowed: ${allowedTransitions.join(', ')}`,
    );
  }

  // Check dependencies before starting
  if (newStatus === 'running') {
    if (!taskOps.areDependenciesResolved(taskId)) {
      throw new Error(
        `Cannot start task ${taskId}: dependencies not resolved. ` +
          `Blocking tasks: ${task.dependencies
            .filter((d) => {
              const t = taskOps.readTask(d);
              return !t || t.status !== 'completed';
            })
            .join(', ')}`,
      );
    }
  }

  return taskOps.updateTask(taskId, { status: newStatus });
}

/**
 * Start a task (transition to running).
 */
export function startTask(taskId: string, owner?: string): PonyTask | null {
  const updates: Partial<PonyTask> = { status: 'running' };
  if (owner) updates.owner = owner;

  const task = taskOps.readTask(taskId);
  if (!task) return null;

  // Validate dependencies
  if (!taskOps.areDependenciesResolved(taskId)) {
    throw new Error(`Cannot start task ${taskId}: dependencies not resolved`);
  }

  return taskOps.updateTask(taskId, updates);
}

/**
 * Complete a task.
 */
export function completeTask(taskId: string): PonyTask | null {
  return transitionStatus(taskId, 'completed');
}

/**
 * Cancel a task.
 */
export function cancelTask(taskId: string): PonyTask | null {
  return transitionStatus(taskId, 'cancelled');
}

// ─── Task Queries ─────────────────────────────────────────────────────────────

/**
 * Get next pending task ready to start.
 * Returns task with resolved dependencies, sorted by priority.
 */
export function getNextReadyTask(): PonyTask | null {
  const pending = taskOps.getTasksByStatus('pending');

  // Filter to tasks with resolved dependencies
  const ready = pending.filter((t) => taskOps.areDependenciesResolved(t.id));

  if (ready.length === 0) return null;

  // Sort by priority, then by ID (newest first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  ready.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 1;
    const pb = priorityOrder[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return b.id.localeCompare(a.id);
  });

  return ready[0];
}

/**
 * Find tasks by tag.
 */
export function getTasksByTag(tag: string): PonyTask[] {
  return taskOps.readAllTasks().filter((t) => t.tags?.includes(tag));
}

/**
 * Search tasks by title or description.
 */
export function searchTasks(query: string): PonyTask[] {
  const lowerQuery = query.toLowerCase();
  return taskOps
    .readAllTasks()
    .filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery),
    );
}

// ─── Batch Operations ─────────────────────────────────────────────────────────

/**
 * Clear all completed tasks.
 */
export function clearCompletedTasks(): number {
  const completed = taskOps.getTasksByStatus('completed');
  let deleted = 0;

  for (const task of completed) {
    if (taskOps.deleteTask(task.id)) {
      deleted++;
    }
  }

  return deleted;
}

/**
 * Get overall progress percentage.
 */
export function getProgress(projectPath?: string): number {
  const summary = taskOps.getTaskSummary(projectPath);
  if (summary.total === 0) return 0;
  return Math.round((summary.completed / summary.total) * 100);
}
