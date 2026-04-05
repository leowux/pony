/**
 * Task File Operations
 *
 * Atomic file-based CRUD operations for Pony tasks.
 * Tasks are stored in ~/.pony/tasks/task_YYYYMMDD_HHMMSS/
 * Each task has task.json (definition) and state.json (state).
 */

import { existsSync, readdirSync, rmSync } from 'fs';
import type { PonyTask, PonyTaskState, PonyTaskIndex, TaskSummary, ProjectInfo } from '../types.js';
import { atomicWriteJson, ensureDir } from '../lib/atomic-write.js';
import {
  getTasksPath,
  getTaskPath,
  getTaskJsonPath,
  getTaskStatePath,
  getTaskIndexPath,
  generateTaskId,
  isValidTaskId,
  createProjectInfo,
} from '../lib/worktree-paths.js';
import { readJsonFile } from '../lib/utils.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger({ module: 'task-file-ops' });

// ─── Task Index Operations ────────────────────────────────────────────────────

/**
 * Get the task index, creating it if it doesn't exist.
 */
export function getTaskIndex(): PonyTaskIndex {
  const indexPath = getTaskIndexPath();
  const index = readJsonFile<PonyTaskIndex>(indexPath);

  if (index) return index;

  // Create new index
  const newIndex: PonyTaskIndex = {
    total: 0,
    updatedAt: new Date().toISOString(),
    projects: [],
  };

  ensureDir(getTasksPath());
  atomicWriteJson(indexPath, newIndex);
  return newIndex;
}

/**
 * Update the task index.
 */
function updateTaskIndex(updates: Partial<PonyTaskIndex>): void {
  const indexPath = getTaskIndexPath();
  const index = getTaskIndex();

  const updated: PonyTaskIndex = {
    ...index,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  atomicWriteJson(indexPath, updated);
}

// ─── Task CRUD Operations ─────────────────────────────────────────────────────

/**
 * Create a new task.
 * Returns the assigned task ID.
 */
export function createTask(
  task: Omit<PonyTask, 'id' | 'createdAt' | 'updatedAt' | 'project'> & { project?: ProjectInfo },
  projectPath?: string,
): string {
  const tasksDir = getTasksPath();
  ensureDir(tasksDir);

  const id = generateTaskId();
  const now = new Date().toISOString();
  const project = task.project || createProjectInfo(projectPath || process.cwd());

  const newTask: PonyTask = {
    ...task,
    id,
    project,
    createdAt: now,
    updatedAt: now,
    dependencies: task.dependencies || [],
  };

  // Create task directory
  const taskDir = getTaskPath(id);
  ensureDir(taskDir);

  // Write task.json
  const taskJsonPath = getTaskJsonPath(id);
  atomicWriteJson(taskJsonPath, newTask);

  // Write initial state.json
  const initialState: PonyTaskState = {
    status: 'pending',
    updatedAt: now,
  };
  const statePath = getTaskStatePath(id);
  atomicWriteJson(statePath, initialState);

  // Update index
  const index = getTaskIndex();
  const projects = new Set(index.projects);
  projects.add(project.name);
  updateTaskIndex({
    total: index.total + 1,
    projects: Array.from(projects),
  });

  log.info('Task created', { id, title: task.title, project: project.name });

  return id;
}

/**
 * Read a single task by ID.
 * Returns null if not found.
 */
export function readTask(taskId: string): PonyTask | null {
  if (!isValidTaskId(taskId)) return null;

  const taskPath = getTaskJsonPath(taskId);
  if (!existsSync(taskPath)) return null;

  return readJsonFile<PonyTask>(taskPath);
}

/**
 * Read task state by ID.
 * Returns null if not found.
 */
export function readTaskState(taskId: string): PonyTaskState | null {
  if (!isValidTaskId(taskId)) return null;

  const statePath = getTaskStatePath(taskId);
  if (!existsSync(statePath)) return null;

  return readJsonFile<PonyTaskState>(statePath);
}

/**
 * Update a task.
 * Preserves unspecified fields.
 */
export function updateTask(
  taskId: string,
  updates: Partial<Omit<PonyTask, 'id' | 'createdAt'>>,
): PonyTask | null {
  if (!isValidTaskId(taskId)) return null;

  const taskPath = getTaskJsonPath(taskId);
  if (!existsSync(taskPath)) return null;

  const existing = readJsonFile<PonyTask>(taskPath);
  if (!existing) return null;

  const updated: PonyTask = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  // Set completedAt when status changes to completed
  if (updates.status === 'completed' && existing.status !== 'completed') {
    updated.completedAt = new Date().toISOString();
  }

  atomicWriteJson(taskPath, updated);
  log.info('Task updated', { id: taskId, updates: Object.keys(updates) });

  return updated;
}

/**
 * Update task state.
 */
export function updateTaskState(
  taskId: string,
  updates: Partial<Omit<PonyTaskState, 'updatedAt'>>,
): PonyTaskState | null {
  if (!isValidTaskId(taskId)) return null;

  const statePath = getTaskStatePath(taskId);
  const existing = readJsonFile<PonyTaskState>(statePath) || {
    status: 'pending',
    updatedAt: new Date().toISOString(),
  };

  const updated: PonyTaskState = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  atomicWriteJson(statePath, updated);
  log.debug('Task state updated', { id: taskId, status: updates.status });

  return updated;
}

/**
 * Delete a task.
 * Returns true if deleted, false if not found.
 */
export function deleteTask(taskId: string): boolean {
  if (!isValidTaskId(taskId)) return false;

  const taskDir = getTaskPath(taskId);
  if (!existsSync(taskDir)) return false;

  try {
    rmSync(taskDir, { recursive: true });

    // Update index
    const index = getTaskIndex();
    updateTaskIndex({ total: Math.max(0, index.total - 1) });

    log.info('Task deleted', { id: taskId });
    return true;
  } catch (error) {
    log.error('Failed to delete task', { id: taskId, error });
    return false;
  }
}

// ─── List Operations ───────────────────────────────────────────────────────────

/**
 * List all task IDs, sorted by creation time (newest first).
 */
export function listTaskIds(): string[] {
  const tasksDir = getTasksPath();

  if (!existsSync(tasksDir)) return [];

  try {
    return readdirSync(tasksDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && isValidTaskId(d.name))
      .map((d) => d.name)
      .sort((a, b) => b.localeCompare(a)); // Newest first
  } catch {
    return [];
  }
}

/**
 * Read all tasks.
 */
export function readAllTasks(): PonyTask[] {
  const ids = listTaskIds();
  return ids.map((id) => readTask(id)).filter((t): t is PonyTask => t !== null);
}

/**
 * Get tasks filtered by project.
 */
export function getTasksByProject(projectName: string): PonyTask[] {
  return readAllTasks().filter((t) => t.project.name === projectName);
}

/**
 * Get tasks filtered by status.
 */
export function getTasksByStatus(status: PonyTask['status']): PonyTask[] {
  return readAllTasks().filter((t) => t.status === status);
}

/**
 * Get tasks filtered by owner.
 */
export function getTasksByOwner(owner: string): PonyTask[] {
  return readAllTasks().filter((t) => t.owner === owner);
}

// ─── Task Summary ─────────────────────────────────────────────────────────────

/**
 * Get task summary statistics.
 */
export function getTaskSummary(projectPath?: string): TaskSummary {
  const tasks = projectPath
    ? getTasksByProject(createProjectInfo(projectPath).name)
    : readAllTasks();

  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    running: tasks.filter((t) => t.status === 'running').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    cancelled: tasks.filter((t) => t.status === 'cancelled').length,
  };
}

// ─── Dependency Resolution ────────────────────────────────────────────────────

/**
 * Check if all dependencies are resolved (completed).
 */
export function areDependenciesResolved(taskId: string): boolean {
  const task = readTask(taskId);
  if (!task || !task.dependencies.length) return true;

  for (const depId of task.dependencies) {
    const dep = readTask(depId);
    if (!dep || dep.status !== 'completed') return false;
  }

  return true;
}

/**
 * Get tasks that depend on a given task.
 */
export function getDependentTasks(taskId: string): PonyTask[] {
  return readAllTasks().filter((t) => t.dependencies.includes(taskId));
}

// ─── Current Task Tracking ────────────────────────────────────────────────────

/**
 * Get the current active task (running, highest priority).
 */
export function getCurrentTask(): PonyTask | null {
  const running = getTasksByStatus('running');

  if (running.length === 0) return null;

  // Sort by priority (high > medium > low), then by ID (newest first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  running.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 1;
    const pb = priorityOrder[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return b.id.localeCompare(a.id); // Newest first
  });

  return running[0];
}
