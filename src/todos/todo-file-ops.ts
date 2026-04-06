/**
 * Todo File Operations
 *
 * Atomic file-based CRUD operations for Pony todos.
 * Todos are stored in ~/.pony/todos/<listId>.json
 * Each list file contains an array of todo items.
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Todo, TodoList } from '../types.js';
import { atomicWriteJson, ensureDir } from '../lib/atomic-write.js';
import { readJsonFile } from '../lib/utils.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger({ module: 'todo-file-ops' });

// ─── Path Helpers ────────────────────────────────────────────────────────────

/**
 * Get the todos directory path (~/.pony/todos/).
 */
export function getTodosPath(): string {
  return join(homedir(), '.pony', 'todos');
}

/**
 * Get a specific todo list file path.
 */
export function getTodoListPath(listId: string): string {
  return join(getTodosPath(), `${listId}.json`);
}

/**
 * Ensure todos directory exists.
 */
export function ensureTodosDir(): string {
  const todosDir = getTodosPath();
  ensureDir(todosDir);
  return todosDir;
}

// ─── Todo ID Generation ──────────────────────────────────────────────────────

/**
 * Generate a unique todo ID.
 * Format: todo_XXX (simple incrementing counter per list).
 */
export function generateTodoId(list: TodoList): string {
  const maxNum = list.todos.reduce((max, todo) => {
    const match = todo.id.match(/^todo_(\d+)$/);
    if (match) {
      return Math.max(max, parseInt(match[1], 10));
    }
    return max;
  }, 0);
  return `todo_${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Validate todo ID format.
 */
export function isValidTodoId(todoId: string): boolean {
  return /^todo_\d{3}$/.test(todoId);
}

// ─── List Operations ───────────────────────────────────────────────────────────

/**
 * Get or create a todo list.
 */
export function getTodoList(listId: string = 'default'): TodoList {
  ensureTodosDir();
  const listPath = getTodoListPath(listId);

  const existing = readJsonFile<TodoList>(listPath);
  if (existing) return existing;

  // Create new list
  const newList: TodoList = {
    id: listId,
    name: listId,
    todos: [],
    updatedAt: new Date().toISOString(),
  };

  atomicWriteJson(listPath, newList);
  log.info('Todo list created', { listId });
  return newList;
}

/**
 * Save a todo list.
 */
export function saveTodoList(list: TodoList): void {
  ensureTodosDir();
  const listPath = getTodoListPath(list.id);

  const updated: TodoList = {
    ...list,
    updatedAt: new Date().toISOString(),
  };

  atomicWriteJson(listPath, updated);
  log.debug('Todo list saved', { listId: list.id, count: list.todos.length });
}

/**
 * List all available todo list IDs.
 */
export function listTodoLists(): string[] {
  const todosDir = getTodosPath();
  if (!existsSync(todosDir)) return [];

  try {
    return readdirSync(todosDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Delete a todo list.
 */
export function deleteTodoList(listId: string): boolean {
  const listPath = getTodoListPath(listId);
  if (!existsSync(listPath)) return false;

  try {
    const { rmSync } = require('fs');
    rmSync(listPath);
    log.info('Todo list deleted', { listId });
    return true;
  } catch (error) {
    log.error('Failed to delete todo list', { listId, error });
    return false;
  }
}

// ─── Todo CRUD Operations ─────────────────────────────────────────────────────

/**
 * Create a new todo item in a list.
 */
export function createTodo(text: string, listId: string = 'default'): Todo {
  const list = getTodoList(listId);

  const newTodo: Todo = {
    id: generateTodoId(list),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    listId,
  };

  list.todos.push(newTodo);
  saveTodoList(list);

  log.info('Todo created', { id: newTodo.id, listId, text });
  return newTodo;
}

/**
 * Read a todo by ID from a specific list.
 */
export function readTodo(todoId: string, listId: string = 'default'): Todo | null {
  if (!isValidTodoId(todoId)) return null;

  const list = getTodoList(listId);
  return list.todos.find((t) => t.id === todoId) || null;
}

/**
 * Update a todo item.
 */
export function updateTodo(
  todoId: string,
  updates: Partial<Omit<Todo, 'id' | 'createdAt'>>,
  listId: string = 'default',
): Todo | null {
  if (!isValidTodoId(todoId)) return null;

  const list = getTodoList(listId);
  const index = list.todos.findIndex((t) => t.id === todoId);

  if (index === -1) return null;

  const updated: Todo = {
    ...list.todos[index],
    ...updates,
    id: todoId,
    createdAt: list.todos[index].createdAt,
  };

  list.todos[index] = updated;
  saveTodoList(list);

  log.info('Todo updated', { id: todoId, listId, updates: Object.keys(updates) });
  return updated;
}

/**
 * Delete a todo item.
 */
export function deleteTodo(todoId: string, listId: string = 'default'): boolean {
  if (!isValidTodoId(todoId)) return false;

  const list = getTodoList(listId);
  const index = list.todos.findIndex((t) => t.id === todoId);

  if (index === -1) return false;

  list.todos.splice(index, 1);
  saveTodoList(list);

  log.info('Todo deleted', { id: todoId, listId });
  return true;
}

// ─── Bulk Operations ──────────────────────────────────────────────────────────

/**
 * Read all todos from a list.
 */
export function readAllTodos(listId: string = 'default'): Todo[] {
  const list = getTodoList(listId);
  return list.todos;
}

/**
 * Get all todos across all lists.
 */
export function getAllTodos(): Todo[] {
  const listIds = listTodoLists();
  const allTodos: Todo[] = [];

  for (const listId of listIds) {
    const list = getTodoList(listId);
    allTodos.push(...list.todos);
  }

  return allTodos;
}

/**
 * Toggle todo completion status.
 */
export function toggleTodo(todoId: string, listId: string = 'default'): Todo | null {
  const todo = readTodo(todoId, listId);
  if (!todo) return null;

  return updateTodo(todoId, { completed: !todo.completed }, listId);
}

/**
 * Mark todo as completed.
 */
export function completeTodo(todoId: string, listId: string = 'default'): Todo | null {
  return updateTodo(todoId, { completed: true }, listId);
}

/**
 * Mark todo as incomplete.
 */
export function uncompleteTodo(todoId: string, listId: string = 'default'): Todo | null {
  return updateTodo(todoId, { completed: false }, listId);
}

/**
 * Clear all completed todos from a list.
 */
export function clearCompletedTodos(listId: string = 'default'): number {
  const list = getTodoList(listId);
  const originalCount = list.todos.length;

  list.todos = list.todos.filter((t) => !t.completed);
  const clearedCount = originalCount - list.todos.length;

  if (clearedCount > 0) {
    saveTodoList(list);
    log.info('Completed todos cleared', { listId, count: clearedCount });
  }

  return clearedCount;
}

/**
 * Reorder todos in a list.
 */
export function reorderTodos(todoIds: string[], listId: string = 'default'): Todo[] {
  const list = getTodoList(listId);

  // Build reordered array
  const reordered: Todo[] = [];
  const remaining = [...list.todos];

  for (const id of todoIds) {
    const index = remaining.findIndex((t) => t.id === id);
    if (index !== -1) {
      reordered.push(remaining[index]);
      remaining.splice(index, 1);
    }
  }

  // Append remaining items that weren't in the reorder list
  list.todos = [...reordered, ...remaining];
  saveTodoList(list);

  log.info('Todos reordered', { listId, ordered: todoIds.length });
  return list.todos;
}

/**
 * Get todo summary statistics for a list.
 */
export function getTodoSummary(listId: string = 'default'): {
  total: number;
  completed: number;
  pending: number;
} {
  const todos = readAllTodos(listId);
  return {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    pending: todos.filter((t) => !t.completed).length,
  };
}
