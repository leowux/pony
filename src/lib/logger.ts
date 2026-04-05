/**
 * Logger Module
 *
 * Provides logging functionality with multiple levels and automatic rotation.
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface LoggerOptions {
  level?: LogLevel;
  module: string;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error | Record<string, unknown>): void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_LOG_LEVEL: LogLevel = 'info';
const LOG_RETENTION_DAYS = 7;

// ─── Log Directory ─────────────────────────────────────────────────────────────

function getLogDir(): string {
  return join(homedir(), '.pony', 'logs');
}

function ensureLogDir(): void {
  const logDir = getLogDir();
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

// ─── Log Rotation ──────────────────────────────────────────────────────────────

function getLogFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `pony-${yyyy}-${mm}-${dd}.log`;
}

function getLogPath(): string {
  return join(getLogDir(), getLogFileName());
}

function rotateLogs(): void {
  const logDir = getLogDir();
  if (!existsSync(logDir)) return;

  const now = Date.now();
  const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const files = readdirSync(logDir);
  for (const file of files) {
    if (!file.startsWith('pony-') || !file.endsWith('.log')) continue;
    if (file === getLogFileName()) continue; // Don't delete current log

    const filePath = join(logDir, file);
    try {
      const stats = statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        unlinkSync(filePath);
      }
    } catch {
      // Ignore errors
    }
  }
}

// ─── Log Formatting ────────────────────────────────────────────────────────────

function formatTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const MM = String(now.getMinutes()).padStart(2, '0');
  const SS = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}.${ms}`;
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase().padEnd(5)}]`,
    `[${entry.module}]`,
    entry.message,
  ];

  if (entry.meta && Object.keys(entry.meta).length > 0) {
    parts.push(JSON.stringify(entry.meta));
  }

  return parts.join(' ') + '\n';
}

// ─── Global Log Level ──────────────────────────────────────────────────────────

let globalLogLevel: LogLevel = DEFAULT_LOG_LEVEL;

export function setLogLevel(level: LogLevel): void {
  globalLogLevel = level;
}

export function getLogLevel(): LogLevel {
  return globalLogLevel;
}

// ─── Create Logger ─────────────────────────────────────────────────────────────

export function createLogger(options: LoggerOptions): Logger {
  const { module, level = globalLogLevel } = options;
  const minLevel = LOG_LEVELS[level];

  function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < minLevel) return;

    ensureLogDir();
    rotateLogs();

    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      module,
      message,
      meta,
    };

    const formatted = formatEntry(entry);
    const logPath = getLogPath();

    try {
      appendFileSync(logPath, formatted);
    } catch {
      // Silently fail if logging fails
    }

    // Also output to stderr for errors
    if (level === 'error') {
      console.error(`[${module}] ${message}`, meta || '');
    }
  }

  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      log('debug', message, meta);
    },
    info(message: string, meta?: Record<string, unknown>): void {
      log('info', message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      log('warn', message, meta);
    },
    error(message: string, error?: Error | Record<string, unknown>): void {
      const meta = error instanceof Error ? { error: error.message, stack: error.stack } : error;
      log('error', message, meta);
    },
  };
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

export function getLogDirPath(): string {
  return getLogDir();
}

export function getLatestLogPath(): string {
  return getLogPath();
}

export function cleanOldLogs(): number {
  ensureLogDir();
  rotateLogs();

  const logDir = getLogDir();
  const files = readdirSync(logDir);
  let deleted = 0;

  const now = Date.now();
  const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const file of files) {
    if (!file.startsWith('pony-') || !file.endsWith('.log')) continue;

    const filePath = join(logDir, file);
    try {
      const stats = statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        unlinkSync(filePath);
        deleted++;
      }
    } catch {
      // Ignore errors
    }
  }

  return deleted;
}
