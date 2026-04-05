/**
 * Atomic Write Utilities
 *
 * Provides atomic file write operations using the temp-then-rename pattern.
 * This prevents data corruption from partial writes or concurrent access.
 *
 * Pattern from OMC: write to .tmp file, then rename atomically.
 */

import { writeFileSync, renameSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { dirname, basename, join } from 'path';

/**
 * Atomically write JSON data to a file.
 * Writes to a temp file first, then renames to target.
 */
export function atomicWriteJson(filePath: string, data: unknown): void {
  const tempPath = join(dirname(filePath), `.tmp.${basename(filePath)}`);
  const content = JSON.stringify(data, null, 2);

  // Write to temp file
  writeFileSync(tempPath, content, 'utf-8');

  // Atomic rename (POSIX guarantees atomicity)
  renameSync(tempPath, filePath);
}

/**
 * Atomically write text content to a file.
 */
export function atomicWriteText(filePath: string, content: string): void {
  const tempPath = join(dirname(filePath), `.tmp.${basename(filePath)}`);

  // Write to temp file
  writeFileSync(tempPath, content, 'utf-8');

  // Atomic rename
  renameSync(tempPath, filePath);
}

/**
 * Ensure a directory exists, creating it if necessary.
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Safely delete a file, ignoring errors if it doesn't exist.
 */
export function safeUnlink(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // Ignore errors - file may not exist or be locked
  }
}

/**
 * Check if a file exists.
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}
