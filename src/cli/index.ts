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
import type {
  PonyTask,
  PonyTaskPriority,
  PonyTaskStatus,
  PonyConfig,
  PonyHudElementConfig,
} from '../types.js';
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
import { readHudConfig, updateHudConfig, applyHudPreset, updateHudElement } from '../lib/config.js';
import { containsUrls, extractUrls, fetchUrl } from '../lib/url-fetcher.js';
import { writeRequirement, writeSupplemental } from '../tasks/requirements-ops.js';
import {
  writeAgentReport,
  readAgentReport,
  listReports,
  generateReportTemplate,
} from '../tasks/report-ops.js';
import { createTodo, readAllTodos } from '../todos/todo-file-ops.js';
import {
  quickDone,
  quickToggle,
  quickDelete,
  quickClear,
  formatTodosForDisplay,
  formatAllListsSummary,
  getPendingTodos,
  getCompletedTodos,
} from '../todos/todo-manager.js';
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
  .description('Create a new task (supports URLs for requirements)')
  .option('-p, --priority <priority>', 'Task priority (high, medium, low)', 'medium')
  .option('-d, --depends-on <taskIds...>', 'Task dependencies (space-separated IDs)')
  .option('-t, --tag <tags...>', 'Task tags (space-separated)')
  .option('-o, --owner <owner>', 'Task owner/agent')
  .option('--desc <description>', 'Task description')
  .option('--project <path>', 'Project path', process.cwd())
  .action(async (title, options) => {
    try {
      const id = createTask(
        {
          title: containsUrls(title) ? extractUrls(title)[0]! : title,
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

      // Handle requirements
      if (containsUrls(title)) {
        console.log(chalk.cyan('\nFetching requirement from URL...'));
        const urls = extractUrls(title);

        // First URL as main requirement
        const mainUrl = urls[0]!;
        const mainHtml = await fetchUrl(mainUrl);
        writeRequirement(
          id,
          `# Requirement\n\nSource: ${mainUrl}\n\nRetrieved: ${new Date().toISOString()}\n\n---\n\n\`\`\`html\n${mainHtml.slice(0, 10000)}\n\`\`\`\n`,
        );
        console.log(chalk.green(`  ✓ Requirement saved from ${mainUrl}`));

        // Additional URLs as supplementals
        for (let i = 1; i < urls.length; i++) {
          const suppUrl = urls[i]!;
          console.log(chalk.gray(`  Fetching supplemental ${i}/${urls.length - 1}...`));
          const suppHtml = await fetchUrl(suppUrl);
          writeSupplemental(
            id,
            `# Supplemental ${i}\n\nSource: ${suppUrl}\n\nRetrieved: ${new Date().toISOString()}\n\n---\n\n\`\`\`html\n${suppHtml.slice(0, 10000)}\n\`\`\`\n`,
            i,
          );
        }
        if (urls.length > 1) {
          console.log(chalk.green(`  ✓ ${urls.length - 1} supplemental file(s) saved`));
        }
      } else {
        // Plain text as requirement
        writeRequirement(id, title);
        console.log(chalk.gray('  Requirement saved'));
      }

      log.info('Task created via CLI', { id, title, hasUrls: containsUrls(title) });
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
  .command('reset [taskId]')
  .description('Reset task(s) to pending status')
  .option('--running', 'Reset all running tasks')
  .option('--stale', 'Only reset tasks running for more than specified hours')
  .option('--hours <hours>', 'Hours threshold for --stale (default: 1)', '1')
  .action((taskId, options) => {
    try {
      if (options.running) {
        // Reset all running tasks
        const runningTasks = readAllTasks().filter((t) => t.status === 'running');

        let tasksToReset = runningTasks;

        if (options.stale) {
          const hours = parseInt(options.hours, 10) || 1;
          const threshold = Date.now() - hours * 60 * 60 * 1000;
          tasksToReset = runningTasks.filter((t) => {
            const updatedAt = new Date(t.updatedAt).getTime();
            return updatedAt < threshold;
          });
        }

        if (tasksToReset.length === 0) {
          console.log(chalk.gray('No running tasks to reset.'));
          return;
        }

        for (const task of tasksToReset) {
          updateTask(task.id, { status: 'pending' });
        }

        console.log(chalk.green(`✓ Reset ${tasksToReset.length} running tasks to pending`));
        if (options.stale) {
          console.log(chalk.gray(`  (running for more than ${options.hours} hour(s))`));
        }
        return;
      }

      if (!taskId) {
        console.error(chalk.red('Task ID required, or use --running'));
        process.exit(1);
      }

      const task = readTask(taskId);
      if (!task) {
        console.error(chalk.red(`Task ${taskId} not found`));
        process.exit(1);
      }

      if (task.status === 'pending') {
        console.log(chalk.gray(`Task ${taskId} is already pending`));
        return;
      }

      updateTask(taskId, { status: 'pending' });
      console.log(chalk.green(`✓ Reset task ${taskId} to pending: ${task.title}`));
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

// ─── HUD Config Command ────────────────────────────────────────────────────────

program
  .command('hud-config')
  .alias('hud config')
  .description('Configure HUD display elements')
  .argument('[action]', 'Action: preset, element, show')
  .argument('[args...]', 'Additional arguments')
  .option('-p, --preset <preset>', 'Set preset (minimal, focused, full)')
  .option('-e, --element <element>', 'Element name to toggle')
  .option('--on', 'Enable the element')
  .option('--off', 'Disable the element')
  .action((action, args, options) => {
    try {
      // Show current config
      if (action === 'show' || !action) {
        const config = readHudConfig();
        console.log(chalk.bold('\nHUD Configuration'));
        console.log('─'.repeat(30));
        console.log(`Enabled: ${config.hud.enabled ? chalk.green('yes') : chalk.gray('no')}`);
        console.log(`Preset: ${config.hud.preset}`);
        console.log(chalk.bold('\nElements:'));
        for (const [key, value] of Object.entries(config.hud.elements)) {
          const status = value ? chalk.green('on') : chalk.gray('off');
          console.log(`  ${key}: ${status}`);
        }
        console.log();
        return;
      }

      // Apply preset
      if (action === 'preset' || options.preset) {
        const preset = options.preset || args[0];
        if (!['minimal', 'focused', 'full'].includes(preset)) {
          console.error(chalk.red(`Invalid preset: ${preset}. Use minimal, focused, or full.`));
          process.exit(1);
        }
        const config = applyHudPreset(preset as PonyConfig['hud']['preset']);
        console.log(chalk.green(`✓ Applied preset: ${preset}`));
        console.log(chalk.gray('Elements now:'));
        const enabledList = Object.entries(config.hud.elements)
          .filter(([_, v]) => v)
          .map(([k]) => k);
        console.log(chalk.gray(`  ${enabledList.join(', ')}`));
        return;
      }

      // Toggle specific element
      if (action === 'element' || options.element) {
        const element = options.element || args[0];
        const validElements: (keyof PonyHudElementConfig)[] = [
          'ponyLabel',
          'tasks',
          'currentTask',
          'sessionDuration',
          'agents',
          'context',
          'tokens',
        ];

        if (!validElements.includes(element as keyof PonyHudElementConfig)) {
          console.error(chalk.red(`Invalid element: ${element}`));
          console.log(chalk.gray(`Valid elements: ${validElements.join(', ')}`));
          process.exit(1);
        }

        // Determine enabled state
        let enabled: boolean;
        if (options.on) {
          enabled = true;
        } else if (options.off) {
          enabled = false;
        } else {
          // Toggle if no --on/--off specified
          const current = readHudConfig().hud.elements[element as keyof PonyHudElementConfig];
          enabled = !current;
        }

        updateHudElement(element as keyof PonyHudElementConfig, enabled);
        console.log(chalk.green(`✓ Element ${element}: ${enabled ? 'enabled' : 'disabled'}`));
        return;
      }

      console.error(chalk.red(`Unknown action: ${action}`));
      console.log(chalk.gray('Valid actions: show, preset, element'));
      process.exit(1);
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

// ─── Report Command ─────────────────────────────────────────────────────────────

program
  .command('report <taskId>')
  .description('Write or read an agent report for a task')
  .option('-a, --agent <name>', 'Agent name (planner, executor, verifier, etc.)')
  .option('-f, --file <path>', 'Read report content from file')
  .option('-t, --text <text>', 'Report content as text')
  .option('--append', 'Append to existing report')
  .option('--list', 'List all reports for the task')
  .option('--template', 'Generate a report template')
  .action((taskId, options) => {
    try {
      const task = readTask(taskId);
      if (!task) {
        console.error(chalk.red(`Task ${taskId} not found`));
        process.exit(1);
      }

      // List reports
      if (options.list) {
        const reports = listReports(taskId);
        if (reports.length === 0) {
          console.log(chalk.gray('No reports found for this task.'));
          return;
        }
        console.log(chalk.bold(`\nReports for ${taskId}:`));
        console.log('─'.repeat(40));
        for (const report of reports) {
          const agentName = report.replace('-report.md', '');
          console.log(`  ${chalk.cyan(agentName)}: ${report}`);
        }
        console.log();
        return;
      }

      // Generate template
      if (options.template) {
        const agentName = options.agent || 'agent';
        const template = generateReportTemplate(agentName, task.title);
        console.log(template);
        return;
      }

      // Require agent name for write/read
      if (!options.agent) {
        console.error(chalk.red('Agent name required. Use -a <name>'));
        console.log(chalk.gray('Example: pony report task_xxx -a executor -t "Work completed"'));
        process.exit(1);
      }

      // Read existing report
      if (!options.file && !options.text) {
        const content = readAgentReport(taskId, options.agent);
        if (!content) {
          console.log(chalk.gray(`No report found for agent: ${options.agent}`));
          return;
        }
        console.log(content);
        return;
      }

      // Write report
      let content = '';
      if (options.file) {
        content = readFileSync(options.file, 'utf-8');
      } else if (options.text) {
        content = options.text;
      }

      if (!content.trim()) {
        console.error(chalk.red('Report content is empty'));
        process.exit(1);
      }

      writeAgentReport(taskId, options.agent, content, {
        append: options.append,
      });
      console.log(chalk.green(`✓ Report saved: ${options.agent}-report.md`));
      log.info('Agent report written', { taskId, agent: options.agent });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

// ─── Todo Commands ──────────────────────────────────────────────────────────────

program
  .command('todos')
  .description('List todos or show todo list summary')
  .option('-l, --list <listId>', 'Todo list ID', 'default')
  .option('--pending', 'Show only pending todos')
  .option('--completed', 'Show only completed todos')
  .option('--all', 'Show all todo lists')
  .option('--json', 'Output as JSON')
  .action((options) => {
    try {
      if (options.all) {
        console.log(formatAllListsSummary());
        return;
      }

      if (options.json) {
        const todos = options.pending
          ? getPendingTodos(options.list)
          : options.completed
            ? getCompletedTodos(options.list)
            : readAllTodos(options.list);
        console.log(JSON.stringify(todos, null, 2));
        return;
      }

      if (options.pending) {
        const todos = getPendingTodos(options.list);
        console.log(chalk.bold(`\nPending Todos (${options.list}):`));
        console.log('─'.repeat(30));
        for (const todo of todos) {
          console.log(`  [ ] ${todo.id}: ${todo.text}`);
        }
        if (todos.length === 0) {
          console.log(chalk.gray('  No pending todos.'));
        }
        console.log();
        return;
      }

      if (options.completed) {
        const todos = getCompletedTodos(options.list);
        console.log(chalk.bold(`\nCompleted Todos (${options.list}):`));
        console.log('─'.repeat(30));
        for (const todo of todos) {
          console.log(`  [x] ${todo.id}: ${chalk.gray(todo.text)}`);
        }
        if (todos.length === 0) {
          console.log(chalk.gray('  No completed todos.'));
        }
        console.log();
        return;
      }

      // Default: show full list
      console.log(formatTodosForDisplay(options.list));
      console.log();
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

// Todo subcommands via 'todo' command
program
  .command('todo <action>')
  .description('Manage individual todos (add, done, toggle, delete, clear)')
  .argument('[args...]', 'Additional arguments')
  .option('-l, --list <listId>', 'Todo list ID', 'default')
  .option('-t, --text <text>', 'Todo text (for add)')
  .action((action, args, options) => {
    try {
      switch (action) {
        case 'add': {
          const text = options.text || args[0];
          if (!text) {
            console.error(chalk.red('Todo text required. Usage: pony todo add "Buy groceries"'));
            process.exit(1);
          }
          const todo = createTodo(text, options.list);
          console.log(chalk.green(`✓ Added todo ${todo.id}: ${todo.text}`));
          return;
        }

        case 'done': {
          const todoId = args[0];
          if (!todoId) {
            console.error(chalk.red('Todo ID required. Usage: pony todo done todo_001'));
            process.exit(1);
          }
          const todo = quickDone(todoId);
          if (!todo) {
            console.error(chalk.red(`Todo ${todoId} not found`));
            process.exit(1);
          }
          console.log(chalk.green(`✓ Completed todo ${todoId}: ${todo.text}`));
          return;
        }

        case 'toggle': {
          const todoId = args[0];
          if (!todoId) {
            console.error(chalk.red('Todo ID required. Usage: pony todo toggle todo_001'));
            process.exit(1);
          }
          const todo = quickToggle(todoId);
          if (!todo) {
            console.error(chalk.red(`Todo ${todoId} not found`));
            process.exit(1);
          }
          const status = todo.completed ? 'completed' : 'pending';
          console.log(chalk.cyan(`✓ Toggled todo ${todoId} to ${status}: ${todo.text}`));
          return;
        }

        case 'delete': {
          const todoId = args[0];
          if (!todoId) {
            console.error(chalk.red('Todo ID required. Usage: pony todo delete todo_001'));
            process.exit(1);
          }
          const deleted = quickDelete(todoId);
          if (!deleted) {
            console.error(chalk.red(`Todo ${todoId} not found`));
            process.exit(1);
          }
          console.log(chalk.gray(`✗ Deleted todo ${todoId}`));
          return;
        }

        case 'clear': {
          const count = quickClear();
          console.log(chalk.green(`✓ Cleared ${count} completed todos`));
          return;
        }

        case 'list': {
          console.log(formatTodosForDisplay(options.list));
          console.log();
          return;
        }

        default:
          console.error(chalk.red(`Unknown action: ${action}`));
          console.log(chalk.gray('Valid actions: add, done, toggle, delete, clear, list'));
          process.exit(1);
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
      mkdirSync(join(ponyRoot, 'todos'), { recursive: true });

      console.log(chalk.green('✓ Pony initialized'));
      console.log();
      console.log('Global storage: ~/.pony/');
      console.log();
      console.log(chalk.bold('Quick start:'));
      console.log('  pony add "My first task"    # Create a task');
      console.log('  pony list                   # List all tasks');
      console.log('  pony next                   # Get next task');
      console.log();
      console.log(chalk.bold('Todos:'));
      console.log('  pony todo add "Buy groceries"  # Add a todo');
      console.log('  pony todos                    # List todos');
      console.log('  pony todo done todo_001       # Mark done');
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
