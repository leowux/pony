/**
 * Pony - Task Management Types
 *
 * Core type definitions for the Pony task management system.
 * All data is stored globally in ~/.pony/
 */

// ─── Task Status & Priority ──────────────────────────────────────────────────

export type PonyTaskStatus = 'pending' | 'running' | 'completed' | 'cancelled';

export type PonyTaskPriority = 'high' | 'medium' | 'low';

// ─── Project Info ────────────────────────────────────────────────────────────

/**
 * Project information attached to a task.
 */
export interface ProjectInfo {
  /** Project name (directory name) */
  name: string;
  /** Full project path */
  path: string;
}

// ─── Core Task Interface ──────────────────────────────────────────────────────

/**
 * Task data stored in task.json.
 */
export interface PonyTask {
  /** Unique task ID (format: task_YYYYMMDD_HHMMSS) */
  id: string;
  /** Short task title */
  title: string;
  /** Detailed task description */
  description: string;
  /** Current status */
  status: PonyTaskStatus;
  /** Priority level */
  priority: PonyTaskPriority;
  /** Project this task belongs to */
  project: ProjectInfo;
  /** Creation timestamp (ISO) */
  createdAt: string;
  /** Last update timestamp (ISO) */
  updatedAt: string;
  /** Completion timestamp (ISO) when status is 'completed' */
  completedAt?: string;
  /** Agent name assigned to this task */
  owner?: string;
  /** Task IDs this task depends on */
  dependencies: string[];
  /** Optional tags for categorization */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ─── Task State ───────────────────────────────────────────────────────────────

/**
 * Task state stored in state.json (separate from task definition).
 * Allows state changes without modifying the task definition.
 */
export interface PonyTaskState {
  /** Current status (mirrored from task.json for quick access) */
  status: PonyTaskStatus;
  /** When the task was started (status = running) */
  startedAt?: string;
  /** When the task was completed/cancelled */
  completedAt?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Notes added during execution */
  notes?: string[];
  /** Last update timestamp */
  updatedAt: string;
}

// ─── Task Index ───────────────────────────────────────────────────────────────

/**
 * Task index metadata (stored in ~/.pony/tasks/index.json).
 * No longer uses numeric IDs - tasks are identified by timestamp.
 */
export interface PonyTaskIndex {
  /** Total task count */
  total: number;
  /** Last update timestamp */
  updatedAt: string;
  /** Project names with active tasks */
  projects: string[];
}

// ─── HUD State ────────────────────────────────────────────────────────────────

/**
 * Global HUD state (stored in ~/.pony/hud/state.json).
 */
export interface PonyHudState {
  /** Last update timestamp */
  timestamp: string;
  /** Current session ID */
  sessionId?: string;
  /** Session start timestamp */
  sessionStartTimestamp?: string;
  /** Currently active task ID */
  currentTaskId?: string;
  /** Last user prompt timestamp */
  lastPromptTimestamp?: string;
}

// ─── Plugin Configuration ─────────────────────────────────────────────────────

export interface PonyConfig {
  hud: {
    enabled: boolean;
    preset: 'minimal' | 'focused' | 'full';
    elements: PonyHudElementConfig;
    maxOutputLines: number;
  };
  tasks: {
    maxTasks: number;
    autoComplete: boolean;
    defaultPriority: PonyTaskPriority;
  };
}

export interface PonyHudElementConfig {
  ponyLabel: boolean;
  tasks: boolean;
  currentTask: boolean;
  sessionDuration: boolean;
  agents: boolean;
  context: boolean;
  tokens: boolean;
}

// ─── HUD Render Context ───────────────────────────────────────────────────────

export interface PonyHudContext {
  /** Context window usage percentage */
  contextPercent: number;
  /** Model name */
  modelName: string;
  /** All tasks */
  tasks: PonyTask[];
  /** Task summary stats */
  taskSummary: TaskSummary;
  /** Session duration in minutes */
  sessionDurationMinutes: number;
  /** Active agents count */
  activeAgentsCount: number;
  /** Active tools count (from transcript) */
  activeToolsCount: number;
  /** Active skills count (from transcript) */
  activeSkillsCount: number;
  /** Cumulative input tokens */
  inputTokens: number;
  /** Cumulative output tokens */
  outputTokens: number;
  /** Cumulative cache creation tokens */
  cacheCreationTokens: number;
  /** Cumulative cache read tokens */
  cacheReadTokens: number;
  /** Working directory */
  cwd: string;
  /** Git branch name */
  branchName: string | null;
  /** HUD state */
  hudState?: PonyHudState;
}

// ─── Task Summary ─────────────────────────────────────────────────────────────

export interface TaskSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  cancelled: number;
}

// ─── stdin Data from Claude Code ──────────────────────────────────────────────

export interface PonyStdinData {
  cwd?: string;
  transcript_path?: string;
  session_id?: string;
  /** Context window metrics from Claude Code statusline stdin */
  context_window?: {
    /** Direct percentage (0-100) - preferred field */
    used_percentage?: number;
    /** Legacy fields (used/total) */
    used?: number;
    total?: number;
  };
  model?: string;
}

// ─── Global Configuration ─────────────────────────────────────────────────────

export interface PonyGlobalConfig {
  /** Config version */
  version: string;
  /** Minimum log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Days to retain logs */
  logRetentionDays: number;
  /** Maximum tasks to keep */
  maxTasks: number;
}

export const DEFAULT_GLOBAL_CONFIG: PonyGlobalConfig = {
  version: '0.1.0',
  logLevel: 'info',
  logRetentionDays: 7,
  maxTasks: 1000,
};

// ─── Todo Types ────────────────────────────────────────────────────────────────

/**
 * A simple todo item for quick checklist management.
 */
export interface Todo {
  /** Unique todo ID (format: todo_XXX) */
  id: string;
  /** Todo text content */
  text: string;
  /** Completion status */
  completed: boolean;
  /** Creation timestamp (ISO) */
  createdAt: string;
  /** Optional list ID for grouping */
  listId?: string;
}

/**
 * Todo list containing multiple todo items.
 */
export interface TodoList {
  /** List name */
  name: string;
  /** List ID (default: 'default') */
  id: string;
  /** Todos in this list */
  todos: Todo[];
  /** Last update timestamp (ISO) */
  updatedAt: string;
}

// ─── Default Configuration ────────────────────────────────────────────────────

export const DEFAULT_PONY_CONFIG: PonyConfig = {
  hud: {
    enabled: true,
    preset: 'focused',
    elements: {
      ponyLabel: true,
      tasks: true,
      currentTask: true,
      sessionDuration: true,
      agents: true,
      context: true,
      tokens: true,
    },
    maxOutputLines: 3,
  },
  tasks: {
    maxTasks: 100,
    autoComplete: false,
    defaultPriority: 'medium',
  },
};

// ─── HUD Preset Configurations ─────────────────────────────────────────────────

/**
 * Preset configurations for HUD elements.
 * Each preset defines which elements are visible.
 */
export const PRESET_CONFIGS: Record<PonyConfig['hud']['preset'], Partial<PonyHudElementConfig>> = {
  minimal: {
    ponyLabel: true,
    tasks: false,
    currentTask: false,
    sessionDuration: false,
    agents: false,
    context: true, // Always show context for safety
    tokens: false,
  },
  focused: {
    ponyLabel: true,
    tasks: true,
    currentTask: true,
    sessionDuration: true,
    agents: true,
    context: true,
    tokens: true,
  },
  full: {
    ponyLabel: true,
    tasks: true,
    currentTask: true,
    sessionDuration: true,
    agents: true,
    context: true,
    tokens: true,
  },
};
