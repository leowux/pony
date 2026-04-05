/**
 * HUD State Management
 *
 * Global HUD state stored in ~/.pony/hud/state.json
 */

import type { PonyHudState } from '../types.js';
import { atomicWriteJson, ensureDir } from '../lib/atomic-write.js';
import { getHudStatePath, getHudPath } from '../lib/worktree-paths.js';
import { readJsonFile } from '../lib/utils.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger({ module: 'hud-state' });

/**
 * Read global HUD state.
 */
export function readHudState(): PonyHudState | null {
  const statePath = getHudStatePath();
  const state = readJsonFile<PonyHudState>(statePath);

  if (state) {
    log.debug('HUD state loaded', { sessionId: state.sessionId });
  }

  return state;
}

/**
 * Write global HUD state.
 */
export function writeHudState(state: PonyHudState): void {
  const hudDir = getHudPath();
  ensureDir(hudDir);

  const statePath = getHudStatePath();
  atomicWriteJson(statePath, state);

  log.debug('HUD state saved', { sessionId: state.sessionId });
}

/**
 * Update HUD state (partial update).
 */
export function updateHudState(updates: Partial<PonyHudState>): PonyHudState {
  const existing = readHudState() || {
    timestamp: new Date().toISOString(),
  };

  const updated: PonyHudState = {
    ...existing,
    ...updates,
    timestamp: new Date().toISOString(),
  };

  writeHudState(updated);
  return updated;
}

/**
 * Initialize HUD state for a new session.
 * Note: sessionStartTimestamp is NOT set here - caller should set it from transcript.
 */
export function initializeHudState(sessionId: string): PonyHudState {
  const existing = readHudState();

  // Preserve session start if same session
  if (existing?.sessionId === sessionId) {
    log.debug('Same session, preserving state', { sessionId });
    return existing;
  }

  // New session - only set sessionId and timestamp
  // sessionStartTimestamp will be set by caller from transcript
  const state: PonyHudState = {
    timestamp: new Date().toISOString(),
    sessionId,
  };

  writeHudState(state);
  log.info('Session initialized', { sessionId });

  return state;
}

/**
 * Record prompt timestamp.
 */
export function recordPromptTimestamp(): void {
  updateHudState({
    lastPromptTimestamp: new Date().toISOString(),
  });
}

/**
 * Set current task.
 */
export function setCurrentTask(taskId: string | undefined): void {
  updateHudState({
    currentTaskId: taskId,
  });

  if (taskId) {
    log.info('Current task set', { taskId });
  }
}
