/**
 * Report Operations
 *
 * Manage agent reports for tasks.
 * Each agent writes a report after completing their work.
 */

import { ensureDir } from '../lib/atomic-write.js';
import { getReportsPath, getAgentReportPath, isValidTaskId } from '../lib/worktree-paths.js';
import { existsSync, readdirSync, readFileSync, appendFileSync, writeFileSync } from 'fs';
import { createLogger } from '../lib/logger.js';

const log = createLogger({ module: 'report-ops' });

/**
 * Ensure the reports directory exists for a task.
 */
export function ensureReportsDir(taskId: string): void {
  if (!isValidTaskId(taskId)) {
    throw new Error(`Invalid task ID: ${taskId}`);
  }
  ensureDir(getReportsPath(taskId));
}

/**
 * Write an agent report.
 * Overwrites existing report by default, or appends if specified.
 */
export function writeAgentReport(
  taskId: string,
  agentName: string,
  content: string,
  options?: { append?: boolean },
): string {
  ensureReportsDir(taskId);
  const filePath = getAgentReportPath(taskId, agentName);

  // Add header if content doesn't start with one
  const timestamp = new Date().toISOString();
  const fullContent = content.trim().startsWith('#')
    ? content
    : `# ${agentName} Report\n\n**Timestamp**: ${timestamp}\n\n${content}`;

  if (options?.append && existsSync(filePath)) {
    appendFileSync(filePath, `\n\n---\n\n${fullContent}`, 'utf-8');
    log.info('Report appended', { taskId, agentName });
  } else {
    writeFileSync(filePath, fullContent, 'utf-8');
    log.info('Report written', { taskId, agentName, path: filePath });
  }

  return filePath;
}

/**
 * Read an agent report.
 */
export function readAgentReport(taskId: string, agentName: string): string | null {
  if (!isValidTaskId(taskId)) return null;

  const filePath = getAgentReportPath(taskId, agentName);
  if (!existsSync(filePath)) return null;

  return readFileSync(filePath, 'utf-8');
}

/**
 * List all reports for a task.
 */
export function listReports(taskId: string): string[] {
  if (!isValidTaskId(taskId)) return [];

  const reportsPath = getReportsPath(taskId);
  if (!existsSync(reportsPath)) return [];

  try {
    return readdirSync(reportsPath)
      .filter((f) => f.endsWith('-report.md'))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Check if a task has any reports.
 */
export function hasReports(taskId: string): boolean {
  return listReports(taskId).length > 0;
}

/**
 * Get report summary for a task.
 */
export function getReportsSummary(taskId: string): {
  count: number;
  agents: string[];
} {
  const files = listReports(taskId);
  const agents = files.map((f) => f.replace('-report.md', ''));

  return {
    count: files.length,
    agents,
  };
}

/**
 * Generate a report template for an agent.
 */
export function generateReportTemplate(agentName: string, taskTitle: string): string {
  return `# ${agentName} Report

## Task
${taskTitle}

## Summary
<!-- Brief summary of work done -->

## Work Done
<!-- List of completed items -->
-

## Output
<!-- Key outputs, artifacts, or deliverables -->

## Issues
<!-- Any problems encountered -->

## Next Steps
<!-- Recommendations for next agent -->
`;
}
