/**
 * Pony - Task Management Plugin for Claude Code
 *
 * Main entry point exporting core functionality.
 */

// Types
export type {
  PonyTask,
  PonyTaskStatus,
  PonyTaskPriority,
  PonyTaskIndex,
  PonyHudState,
  PonyConfig,
  PonyHudElementConfig,
  PonyHudContext,
  TaskSummary,
  PonyStdinData,
} from './types.js';

export { DEFAULT_PONY_CONFIG } from './types.js';

// Task operations
export {
  createTask,
  readTask,
  updateTask,
  deleteTask,
  listTaskIds,
  readAllTasks,
  getTasksByStatus,
  getTaskSummary,
  areDependenciesResolved,
  getDependentTasks,
  getCurrentTask,
} from './tasks/task-file-ops.js';

// Task manager
export {
  startTask,
  completeTask,
  cancelTask,
  getNextReadyTask,
  getTasksByTag,
  searchTasks,
  clearCompletedTasks,
  getProgress,
} from './tasks/task-manager.js';

// HUD
export { render } from './hud/render.js';
export { main as hudMain } from './hud/index.js';
export {
  readHudState,
  writeHudState,
  updateHudState,
  initializeHudState,
  recordPromptTimestamp,
  setCurrentTask,
} from './hud/state.js';

// Version
export const VERSION = '0.0.1';
