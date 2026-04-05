/**
 * Path Utilities for Global Storage
 *
 * All data is stored in ~/.pony/ directory.
 * Tasks are identified by timestamp: task_YYYYMMDD_HHMMSS
 */

import { join, resolve, normalize, basename } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// ─── Global Root ───────────────────────────────────────────────────────────────

/**
 * Get the global Pony storage root directory (~/.pony/).
 */
export function getGlobalPonyRoot(): string {
  return join(homedir(), '.pony');
}

/**
 * Ensure global Pony root directory exists.
 */
export function ensureGlobalPonyRoot(): string {
  const root = getGlobalPonyRoot();
  if (!existsSync(root)) {
    const { mkdirSync } = require('fs');
    mkdirSync(root, { recursive: true });
  }
  return root;
}

// ─── Task ID Generation ────────────────────────────────────────────────────────

/**
 * Generate a unique task ID based on current timestamp.
 * Format: task_YYYYMMDD_HHMMSS_mmm (milliseconds suffix for uniqueness)
 */
export function generateTaskId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const MM = String(now.getMinutes()).padStart(2, '0');
  const SS = String(now.getSeconds()).padStart(2, '0');
  const mmm = String(now.getMilliseconds()).padStart(3, '0');
  return `task_${yyyy}${mm}${dd}_${HH}${MM}${SS}_${mmm}`;
}

/**
 * Validate task ID format.
 */
export function isValidTaskId(taskId: string): boolean {
  return /^task_\d{8}_\d{6}_\d{3}$/.test(taskId);
}

// ─── Task Paths ────────────────────────────────────────────────────────────────

/**
 * Get the tasks directory path (~/.pony/tasks/).
 */
export function getTasksPath(): string {
  return join(getGlobalPonyRoot(), 'tasks');
}

/**
 * Get a specific task directory path.
 */
export function getTaskPath(taskId: string): string {
  return join(getTasksPath(), taskId);
}

/**
 * Get the task.json file path for a task.
 */
export function getTaskJsonPath(taskId: string): string {
  return join(getTaskPath(taskId), 'task.json');
}

/**
 * Get the state.json file path for a task.
 */
export function getTaskStatePath(taskId: string): string {
  return join(getTaskPath(taskId), 'state.json');
}

/**
 * Get the task index file path (~/.pony/tasks/index.json).
 * Stores nextId counter and metadata.
 */
export function getTaskIndexPath(): string {
  return join(getTasksPath(), 'index.json');
}

// ─── HUD Paths ─────────────────────────────────────────────────────────────────

/**
 * Get the HUD directory path (~/.pony/hud/).
 */
export function getHudPath(): string {
  return join(getGlobalPonyRoot(), 'hud');
}

/**
 * Get the HUD state file path (~/.pony/hud/state.json).
 */
export function getHudStatePath(): string {
  return join(getHudPath(), 'state.json');
}

// ─── Config Path ───────────────────────────────────────────────────────────────

/**
 * Get the global config file path (~/.pony/config.json).
 */
export function getConfigPath(): string {
  return join(getGlobalPonyRoot(), 'config.json');
}

// ─── Log Paths ─────────────────────────────────────────────────────────────────

/**
 * Get the logs directory path (~/.pony/logs/).
 */
export function getLogsPath(): string {
  return join(getGlobalPonyRoot(), 'logs');
}

/**
 * Alias for getLogsPath for compatibility.
 */
export function getLogDirPath(): string {
  return getLogsPath();
}

// ─── Cache Paths ───────────────────────────────────────────────────────────────

/**
 * Get the cache directory path (~/.pony/cache/).
 */
export function getCachePath(): string {
  return join(getGlobalPonyRoot(), 'cache');
}

// ─── Project Info ──────────────────────────────────────────────────────────────

/**
 * Extract project name from a path.
 * Example: /Users/leo/Projects/pony → pony
 */
export function getProjectName(projectPath: string): string {
  return basename(resolve(projectPath));
}

/**
 * Create project info object from a path.
 */
export function createProjectInfo(projectPath: string): { name: string; path: string } {
  return {
    name: getProjectName(projectPath),
    path: resolve(projectPath),
  };
}

// ─── Legacy Compatibility ──────────────────────────────────────────────────────

/**
 * @deprecated Use getGlobalPonyRoot() instead.
 */
export function getPonyRoot(_cwd?: string): string {
  return getGlobalPonyRoot();
}

/**
 * @deprecated Tasks are now global, no worktree resolution needed.
 */
export function resolveToWorktreeRoot(startCwd?: string): string {
  return startCwd ?? process.cwd();
}

// ─── Path Validation ───────────────────────────────────────────────────────────

/**
 * Validate that a path is within the expected directory.
 * Prevents path traversal attacks.
 */
export function validatePath(expectedDir: string, targetPath: string): void {
  const resolved = resolve(targetPath);
  const normalized = normalize(resolved);
  if (!normalized.startsWith(expectedDir)) {
    throw new Error(`Path traversal detected: ${targetPath} is outside ${expectedDir}`);
  }
}

/**
 * Sanitize task ID to prevent path traversal.
 * Only allows task_YYYYMMDD_HHMMSS_mmm format.
 */
export function sanitizeTaskId(taskId: string): string {
  if (!isValidTaskId(taskId)) {
    throw new Error(`Invalid task ID: "${taskId}" (expected format: task_YYYYMMDD_HHMMSS_mmm)`);
  }
  return taskId;
}
