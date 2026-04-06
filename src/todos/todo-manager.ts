/**
 * Todo Manager
 *
 * High-level business logic for todo management.
 * Provides convenient operations beyond basic CRUD.
 */

import type { Todo } from '../types.js';
import {
  createTodo,
  deleteTodo,
  readAllTodos,
  toggleTodo,
  completeTodo,
  clearCompletedTodos,
  getTodoList,
  saveTodoList,
  listTodoLists,
  getTodoSummary,
} from './todo-file-ops.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger({ module: 'todo-manager' });

// ─── Quick Actions ────────────────────────────────────────────────────────────

/**
 * Quick add a todo to the default list.
 */
export function quickAdd(text: string): Todo {
  return createTodo(text, 'default');
}

/**
 * Quick mark a todo as done.
 */
export function quickDone(todoId: string): Todo | null {
  return completeTodo(todoId, 'default');
}

/**
 * Quick toggle a todo's completion.
 */
export function quickToggle(todoId: string): Todo | null {
  return toggleTodo(todoId, 'default');
}

/**
 * Quick delete a todo.
 */
export function quickDelete(todoId: string): boolean {
  return deleteTodo(todoId, 'default');
}

/**
 * Quick clear all completed todos.
 */
export function quickClear(): number {
  return clearCompletedTodos('default');
}

// ─── Bulk Operations ───────────────────────────────────────────────────────────

/**
 * Add multiple todos at once.
 */
export function bulkAdd(texts: string[], listId: string = 'default'): Todo[] {
  const todos: Todo[] = [];
  for (const text of texts) {
    todos.push(createTodo(text, listId));
  }
  log.info('Bulk todos added', { count: todos.length, listId });
  return todos;
}

/**
 * Mark multiple todos as completed.
 */
export function bulkComplete(todoIds: string[], listId: string = 'default'): Todo[] {
  const completed: Todo[] = [];
  for (const id of todoIds) {
    const todo = completeTodo(id, listId);
    if (todo) completed.push(todo);
  }
  log.info('Bulk todos completed', { count: completed.length, listId });
  return completed;
}

/**
 * Delete multiple todos.
 */
export function bulkDelete(todoIds: string[], listId: string = 'default'): number {
  let deleted = 0;
  for (const id of todoIds) {
    if (deleteTodo(id, listId)) deleted++;
  }
  log.info('Bulk todos deleted', { count: deleted, listId });
  return deleted;
}

// ─── Search & Filter ───────────────────────────────────────────────────────────

/**
 * Search todos by text content.
 */
export function searchTodos(query: string, listId?: string): Todo[] {
  const todos = listId ? readAllTodos(listId) : readAllTodos('default');
  const lowerQuery = query.toLowerCase();
  return todos.filter((t) => t.text.toLowerCase().includes(lowerQuery));
}

/**
 * Get all pending (incomplete) todos.
 */
export function getPendingTodos(listId: string = 'default'): Todo[] {
  return readAllTodos(listId).filter((t) => !t.completed);
}

/**
 * Get all completed todos.
 */
export function getCompletedTodos(listId: string = 'default'): Todo[] {
  return readAllTodos(listId).filter((t) => t.completed);
}

// ─── Move Operations ───────────────────────────────────────────────────────────

/**
 * Move a todo to a different position in the list.
 */
export function moveTodo(todoId: string, newIndex: number, listId: string = 'default'): Todo[] {
  const list = getTodoList(listId);
  const currentIndex = list.todos.findIndex((t) => t.id === todoId);

  if (currentIndex === -1) return list.todos;

  // Remove from current position
  const [todo] = list.todos.splice(currentIndex, 1);

  // Insert at new position
  list.todos.splice(newIndex, 0, todo);

  saveTodoList(list);
  log.info('Todo moved', { id: todoId, from: currentIndex, to: newIndex, listId });

  return list.todos;
}

/**
 * Move a todo to top of the list.
 */
export function moveTodoToTop(todoId: string, listId: string = 'default'): Todo[] {
  return moveTodo(todoId, 0, listId);
}

/**
 * Move a todo to bottom of the list.
 */
export function moveTodoToBottom(todoId: string, listId: string = 'default'): Todo[] {
  const todos = readAllTodos(listId);
  return moveTodo(todoId, todos.length - 1, listId);
}

// ─── Display Helpers ───────────────────────────────────────────────────────────

/**
 * Format todos for display.
 */
export function formatTodosForDisplay(listId: string = 'default'): string {
  const todos = readAllTodos(listId);
  const summary = getTodoSummary(listId);

  if (todos.length === 0) {
    return 'No todos in this list.';
  }

  const lines: string[] = [];
  lines.push(`Todo List: ${listId}`);
  lines.push(`(${summary.pending} pending, ${summary.completed} completed)`);
  lines.push('');

  for (const todo of todos) {
    const checkbox = todo.completed ? '[x]' : '[ ]';
    const text = todo.completed ? `\x1b[90m${todo.text}\x1b[0m` : todo.text;
    lines.push(`${checkbox} ${todo.id}: ${text}`);
  }

  return lines.join('\n');
}

/**
 * Format all lists summary.
 */
export function formatAllListsSummary(): string {
  const listIds = listTodoLists();

  if (listIds.length === 0) {
    return 'No todo lists found.';
  }

  const lines: string[] = [];
  lines.push('All Todo Lists:');
  lines.push('');

  for (const listId of listIds) {
    const summary = getTodoSummary(listId);
    lines.push(`  ${listId}: ${summary.pending} pending, ${summary.completed} completed`);
  }

  return lines.join('\n');
}
