/**
 * Requirements Operations
 *
 * Manage requirements documents for tasks.
 * Each task can have a main requirement.md and supplemental files.
 */

import { ensureDir } from '../lib/atomic-write.js';
import {
  getRequirementsPath,
  getRequirementFilePath,
  getSupplementalFilePath,
  isValidTaskId,
} from '../lib/worktree-paths.js';
import { existsSync, readFileSync } from 'fs';
import { createLogger } from '../lib/logger.js';

const log = createLogger({ module: 'requirements-ops' });

/**
 * Ensure the requirements directory exists for a task.
 */
export function ensureRequirementsDir(taskId: string): void {
  if (!isValidTaskId(taskId)) {
    throw new Error(`Invalid task ID: ${taskId}`);
  }
  ensureDir(getRequirementsPath(taskId));
}

/**
 * Write the main requirement document.
 */
export function writeRequirement(taskId: string, content: string): string {
  ensureRequirementsDir(taskId);
  const filePath = getRequirementFilePath(taskId);

  // Add header if content doesn't start with one
  const fullContent = content.trim().startsWith('#') ? content : `# Requirement\n\n${content}`;

  const { writeFileSync } = require('fs');
  writeFileSync(filePath, fullContent, 'utf-8');

  log.info('Requirement written', { taskId, path: filePath });
  return filePath;
}

/**
 * Write a supplemental requirement document.
 */
export function writeSupplemental(taskId: string, content: string, index: number): string {
  ensureRequirementsDir(taskId);
  const filePath = getSupplementalFilePath(taskId, index);

  const { writeFileSync } = require('fs');
  writeFileSync(filePath, content, 'utf-8');

  log.info('Supplemental requirement written', { taskId, index, path: filePath });
  return filePath;
}

/**
 * Read the main requirement document.
 */
export function readRequirement(taskId: string): string | null {
  if (!isValidTaskId(taskId)) return null;

  const filePath = getRequirementFilePath(taskId);
  if (!existsSync(filePath)) return null;

  return readFileSync(filePath, 'utf-8');
}

/**
 * Read a supplemental requirement document.
 */
export function readSupplemental(taskId: string, index: number): string | null {
  if (!isValidTaskId(taskId)) return null;

  const filePath = getSupplementalFilePath(taskId, index);
  if (!existsSync(filePath)) return null;

  return readFileSync(filePath, 'utf-8');
}

/**
 * Check if requirements exist for a task.
 */
export function hasRequirements(taskId: string): boolean {
  if (!isValidTaskId(taskId)) return false;
  return existsSync(getRequirementFilePath(taskId));
}

/**
 * Get requirements info for a task.
 */
export function getRequirementsInfo(taskId: string): {
  hasMain: boolean;
  supplementalCount: number;
} {
  if (!isValidTaskId(taskId)) {
    return { hasMain: false, supplementalCount: 0 };
  }

  const reqPath = getRequirementsPath(taskId);
  const hasMain = existsSync(getRequirementFilePath(taskId));

  let supplementalCount = 0;
  if (existsSync(reqPath)) {
    const { readdirSync } = require('fs');
    const files = readdirSync(reqPath) as string[];
    supplementalCount = files.filter(
      (f) => f.startsWith('supplemental-') && f.endsWith('.md'),
    ).length;
  }

  return { hasMain, supplementalCount };
}
