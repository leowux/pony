#!/usr/bin/env node
/**
 * Pony CLI
 *
 * Command-line interface for Pony task management.
 * All data is stored globally in ~/.pony/
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { VERSION } from '../index.js';
import type { PonyTask, PonyTaskPriority, PonyTaskStatus } from '../types.js';
import {
  createTask,
  readTask,
  updateTask,
  deleteTask,
  readAllTasks,
} from '../tasks/task-file-ops.js';
import { getNextReadyTask, clearCompletedTasks } from '../tasks/task-manager.js';
import { getLogDirPath } from '../lib/worktree-paths.js';
import { createLogger, setLogLevel, cleanOldLogs } from '../lib/logger.js';
import { readHudConfig, updateHudConfig } from '../lib/config.js';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const log = createLogger({ module: 'cli' });

const program = new Command();

program
  .name('pony')
  .description('Lightweight task management for Claude Code sessions')
  .version(VERSION)
  .option('--debug', 'Enable debug logging', false);

// ─── Task Commands ────────────────────────────────────────────────────────────

program
  .command('add <title>')
  .description('Create a new task')
  .option('-p, --priority <priority>', 'Task priority (high, medium, low)', 'medium')
  .option('-d, --depends-on <taskIds...>', 'Task dependencies (space-separated IDs)')
  .option('-t, --tag <tags...>', 'Task tags (space-separated)')
  .option('-o, --owner <owner>', 'Task owner/agent')
  .option('--desc <description>', 'Task description')
  .option('--project <path>', 'Project path', process.cwd())
  .action((title, options) => {
    try {
      const id = createTask(
        {
          title,
          description: options.desc || '',
          status: 'pending',
          priority: options.priority as PonyTaskPriority,
          dependencies: options.dependsOn || [],
          tags: options.tag,
          owner: options.owner,
        },
        options.project,
      );

      const task = readTask(id);
      console.log(chalk.green(`✓ Created task ${id}: ${task?.title}`));
      console.log(`  Priority: ${task?.priority}`);
      console.log(`  Project: ${task?.project?.name}`);
      if (task?.dependencies?.length) {
        console.log(`  Dependencies: ${task.dependencies.join(', ')}`);
      }

      log.info('Task created via CLI', { id, title });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all tasks')
  .option('-s, --status <status>', 'Filter by status')
  .option('-o, --owner <owner>', 'Filter by owner')
  .option('-p, --project <name>', 'Filter by project name')
  .option('--summary', 'Show summary statistics only')
  .option('--json', 'Output as JSON')
  .action((options) => {
    try {
      const allTasks = readAllTasks();
      let tasks = allTasks;

      if (options.status) {
        tasks = tasks.filter((t) => t.status === options.status);
      }
      if (options.owner) {
        tasks = tasks.filter((t) => t.owner === options.owner);
      }
      if (options.project) {
        tasks = tasks.filter((t) => t.project?.name === options.project);
      }

      if (options.json) {
        if (options.summary) {
          const summary = {
            total: allTasks.length,
            pending: 0,
            running: 0,
            completed: 0,
            cancelled: 0,
          };
          for (const t of allTasks) summary[t.status]++;
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log(JSON.stringify(tasks, null, 2));
        }
        return;
      }

      // Summary mode
      if (options.summary) {
        const summary = {
          total: allTasks.length,
          pending: 0,
          running: 0,
          completed: 0,
          cancelled: 0,
        };
        for (const t of allTasks) summary[t.status]++;
        const progress =
          summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

        console.log(chalk.bold('\nTask Summary'));
        console.log('─'.repeat(20));
        console.log(`Total: ${summary.total}`);
        console.log(chalk.yellow(`Pending: ${summary.pending}`));
        console.log(chalk.blue(`Running: ${summary.running}`));
        console.log(chalk.green(`Completed: ${summary.completed}`));
        console.log(chalk.gray(`Cancelled: ${summary.cancelled}`));
        console.log();
        console.log(`Progress: ${progress}%`);
        console.log();
        return;
      }

      if (tasks.length === 0) {
        console.log(chalk.gray('No tasks found.'));
        return;
      }

      // Table format
      const header = chalk.bold(
        'ID'.padEnd(26) + 'Status'.padEnd(10) + 'Priority'.padEnd(10) + 'Title',
      );
      console.log(header);
      console.log('─'.repeat(80));

      const statusColors: Record<PonyTaskStatus, (s: string) => string> = {
        pending: chalk.yellow,
        running: chalk.blue,
        completed: chalk.green,
        cancelled: chalk.gray,
      };

      const priorityColors: Record<PonyTaskPriority, (s: string) => string> = {
        high: chalk.red,
        medium: chalk.yellow,
        low: chalk.blue,
      };

      for (const task of tasks) {
        const id = task.id.padEnd(26);
        const status = statusColors[task.status](task.status.padEnd(10));
        const priority = priorityColors[task.priority](task.priority.padEnd(10));
        const title = task.title;
        console.log(`${id}${status}${priority}${title}`);
      }
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

program
  .command('get <taskId>')
  .description('Show task details')
  .action((taskId) => {
    try {
      const task = readTask(taskId);
      if (!task) {
        console.error(chalk.red(`Task ${taskId} not found`));
        process.exit(1);
      }

      console.log(chalk.bold(`Task ${task.id}: ${task.title}\n`));
      console.log(`Status: ${task.status}`);
      console.log(`Priority: ${task.priority}`);
      console.log(`Project: ${task.project?.name} (${task.project?.path})`);
      console.log(`Created: ${task.createdAt}`);
      console.log(`Updated: ${task.updatedAt}`);

      if (task.description) console.log(`\nDescription: ${task.description}`);
      if (task.owner) console.log(`Owner: ${task.owner}`);
      if (task.dependencies.length > 0)
        console.log(`Dependencies: ${task.dependencies.join(', ')}`);
      if (task.tags?.length) console.log(`Tags: ${task.tags.join(', ')}`);
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

program
  .command('update <taskId>')
  .description('Update task properties')
  .option('-s, --status <status>', 'New status (pending, running, completed, cancelled)')
  .option('-p, --priority <priority>', 'New priority')
  .option('-t, --title <title>', 'New title')
  .option('--owner <owner>', 'New owner')
  .action((taskId, options) => {
    try {
      const updates: Partial<PonyTask> = {};
      if (options.status) updates.status = options.status as PonyTaskStatus;
      if (options.priority) updates.priority = options.priority as PonyTaskPriority;
      if (options.title) updates.title = options.title;
      if (options.owner) updates.owner = options.owner;

      const task = updateTask(taskId, updates);
      if (!task) {
        console.error(chalk.red(`Task ${taskId} not found`));
        process.exit(1);
      }

      console.log(chalk.green(`✓ Updated task ${taskId}: ${task.title}`));
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

program
  .command('delete [taskId]')
  .description('Delete a task or bulk delete')
  .option('--completed', 'Delete all completed tasks')
  .action((taskId, options) => {
    try {
      if (options.completed) {
        const count = clearCompletedTasks();
        console.log(chalk.green(`✓ Deleted ${count} completed tasks`));
        return;
      }

      if (!taskId) {
        console.error(chalk.red('Task ID required, or use --completed'));
        process.exit(1);
      }

      const task = readTask(taskId);
      if (!task) {
        console.error(chalk.red(`Task ${taskId} not found`));
        process.exit(1);
      }
      deleteTask(taskId);
      console.log(chalk.red(`✗ Deleted task ${taskId}: ${task.title}`));
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

program
  .command('next')
  .description('Show next task ready to start')
  .option('--json', 'Output as JSON')
  .action((options) => {
    try {
      const task = getNextReadyTask();
      if (!task) {
        if (options.json) {
          console.log('null');
        } else {
          console.log(chalk.gray('No tasks ready to start.'));
        }
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(task, null, 2));
      } else {
        console.log(chalk.bold(`Next task: ${task.id}`));
        console.log(`  Title: ${task.title}`);
        console.log(`  Priority: ${task.priority}`);
        console.log(`  Project: ${task.project?.name}`);
        if (task.dependencies.length > 0) {
          console.log(`  Dependencies: ${task.dependencies.join(', ')}`);
        }
      }
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

// ─── HUD Command ──────────────────────────────────────────────────────────────

program
  .command('hud')
  .description('Manage HUD statusline')
  .argument('[action]', 'Action: on, off, status')
  .action((action) => {
    try {
      if (action === 'on') {
        updateHudConfig({ enabled: true });
        console.log(chalk.green('✓ HUD enabled'));
      } else if (action === 'off') {
        updateHudConfig({ enabled: false });
        console.log(chalk.gray('✓ HUD disabled'));
      } else if (action === 'status') {
        const config = readHudConfig();
        console.log(chalk.bold('\nHUD Status'));
        console.log('─'.repeat(20));
        console.log(`Enabled: ${config.hud.enabled ? chalk.green('yes') : chalk.gray('no')}`);
        console.log(`Preset: ${config.hud.preset}`);
        const enabledElements = Object.entries(config.hud.elements)
          .filter(([_, v]) => v)
          .map(([k]) => k);
        console.log(`Elements: ${enabledElements.join(', ')}`);
        console.log();
      } else {
        // Default: run HUD rendering
        import('../hud/index.js').then(({ main }) => main());
      }
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

// ─── Logs Command ──────────────────────────────────────────────────────────────

program
  .command('logs')
  .description('View logs')
  .option('-f, --follow', 'Follow log output (tail -f style)')
  .option('-l, --level <level>', 'Filter by log level (debug, info, warn, error)')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .option('--clean', 'Clean old log files')
  .action((options) => {
    try {
      if (options.clean) {
        const deleted = cleanOldLogs();
        console.log(chalk.green(`✓ Cleaned ${deleted} old log files`));
        return;
      }

      const logDir = getLogDirPath();
      if (!existsSync(logDir)) {
        console.log(chalk.gray('No logs found.'));
        return;
      }

      // Find latest log file
      const files = readdirSync(logDir)
        .filter((f) => f.startsWith('pony-') && f.endsWith('.log'))
        .sort()
        .reverse();

      if (files.length === 0) {
        console.log(chalk.gray('No log files found.'));
        return;
      }

      const latestLog = join(logDir, files[0]);
      const lines = parseInt(options.lines, 10) || 50;

      if (options.follow) {
        // Tail -f style
        const { spawn } = require('child_process');
        const tail = spawn('tail', ['-f', '-n', String(lines), latestLog], {
          stdio: 'inherit',
        });
        tail.on('close', (code: number) => process.exit(code));
      } else {
        // Read and display
        const content = readFileSync(latestLog, 'utf-8');
        const allLines = content.trim().split('\n');

        let filtered = allLines;
        if (options.level) {
          const levelUpper = options.level.toUpperCase();
          filtered = allLines.filter((l) => l.includes(`[${levelUpper}]`));
        }

        const display = filtered.slice(-lines);
        console.log(display.join('\n'));
      }
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

// ─── Init Command ──────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize Pony task management system')
  .action(() => {
    try {
      const ponyRoot = join(require('os').homedir(), '.pony');
      const { mkdirSync } = require('fs');

      // Create directories
      mkdirSync(join(ponyRoot, 'tasks'), { recursive: true });
      mkdirSync(join(ponyRoot, 'logs'), { recursive: true });
      mkdirSync(join(ponyRoot, 'hud'), { recursive: true });

      console.log(chalk.green('✓ Pony initialized'));
      console.log();
      console.log('Global storage: ~/.pony/');
      console.log();
      console.log(chalk.bold('Quick start:'));
      console.log('  pony add "My first task"    # Create a task');
      console.log('  pony list                   # List all tasks');
      console.log('  pony next                   # Get next task');
      console.log();
      console.log(chalk.bold('Install globally:'));
      console.log(chalk.cyan('  npm install -g pony-cli'));
      console.log(chalk.gray('  # or'));
      console.log(chalk.cyan('  pnpm add -g pony-cli'));
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

// ─── Help Command ──────────────────────────────────────────────────────────────

program
  .command('help [command]')
  .description('Show help for a command or general help')
  .action((commandName) => {
    if (commandName) {
      const cmd = program.commands.find((c) => c.name() === commandName);
      if (cmd) {
        cmd.outputHelp();
        return;
      }
      console.error(chalk.red(`Unknown command: ${commandName}`));
      process.exit(1);
    }
    program.outputHelp();
  });

// ─── Parse Arguments ──────────────────────────────────────────────────────────

// Handle global options
program.hook('preAction', () => {
  const opts = program.opts();
  if (opts.debug) {
    setLogLevel('debug');
    log.debug('Debug mode enabled');
  }
});

program.parse();
