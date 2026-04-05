/**
 * Pony HUD - Main Entry Point
 *
 * Statusline command that visualizes Pony task state.
 * Receives stdin JSON from Claude Code and outputs formatted statusline.
 */

import {
  readStdin,
  getContextPercent,
  getModelName,
  getCwd,
  getTranscriptPath,
  getSessionId,
} from './stdin.js';
import { readHudState, initializeHudState, writeHudState } from './state.js';
import { render } from './render.js';
import { readAllTasks, getTaskSummary } from '../tasks/task-file-ops.js';
import { createProjectInfo } from '../lib/worktree-paths.js';
import { parseTranscript } from './transcript.js';
import { readHudConfig } from '../lib/config.js';
import type { PonyHudContext } from '../types.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger({ module: 'hud' });

/**
 * Main HUD entry point.
 */
async function main(): Promise<void> {
  try {
    // Read config and check if HUD is enabled
    const config = readHudConfig();
    if (!config.hud.enabled) {
      console.log('[Pony] HUD disabled');
      return;
    }

    // Read stdin from Claude Code
    const stdin = await readStdin();

    if (!stdin) {
      console.log('[Pony] Waiting for session...');
      return;
    }

    // Get session ID and initialize HUD state
    const sessionId = getSessionId(stdin);
    const hudState = sessionId ? initializeHudState(sessionId) : readHudState();

    // Get working directory for project context
    const cwd = getCwd(stdin);
    const projectInfo = createProjectInfo(cwd);

    // Get transcript path
    const transcriptPath = getTranscriptPath(stdin);

    // Read tasks (all tasks, could filter by project if needed)
    const tasks = readAllTasks();
    const taskSummary = getTaskSummary(cwd);

    // Parse transcript for tools/skills/agents counts
    const transcriptStats = parseTranscript(transcriptPath);

    // Calculate session duration using transcript sessionStart (like OMC)
    // Persist sessionStartTimestamp to survive tail-parsing resets
    let sessionStart = transcriptStats.sessionStart;
    const sameSession = hudState?.sessionId === sessionId;

    if (sameSession && hudState?.sessionStartTimestamp) {
      // Same session: use persisted value (the real session start)
      const persisted = new Date(hudState.sessionStartTimestamp);
      if (!isNaN(persisted.getTime())) {
        sessionStart = persisted;
      }
    } else if (sessionStart) {
      // New session or first detection: persist transcript's sessionStart
      const stateToWrite = hudState || {
        timestamp: new Date().toISOString(),
      };
      stateToWrite.sessionStartTimestamp = sessionStart.toISOString();
      stateToWrite.sessionId = sessionId ?? undefined;
      stateToWrite.timestamp = new Date().toISOString();
      writeHudState(stateToWrite);
    }

    const sessionDurationMinutes = sessionStart
      ? Math.floor((Date.now() - sessionStart.getTime()) / 60000)
      : 0;

    // Build render context
    const context: PonyHudContext = {
      contextPercent: getContextPercent(stdin),
      modelName: getModelName(stdin),
      tasks,
      taskSummary,
      sessionDurationMinutes,
      activeAgentsCount: transcriptStats.agentCallCount,
      activeToolsCount: transcriptStats.toolCallCount,
      activeSkillsCount: transcriptStats.skillCallCount,
      cwd,
      hudState: hudState || undefined,
    };

    // Render and output
    const output = render(context, config);

    // Replace spaces with non-breaking spaces for terminal alignment
    const formattedOutput = output.replace(/ /g, '\u00A0');
    console.log(formattedOutput);

    log.debug('HUD rendered', {
      sessionId,
      project: projectInfo.name,
      tasks: taskSummary.total,
      ctx: context.contextPercent,
    });
  } catch (error) {
    console.log('[Pony] Error - check stderr');
    console.error('[Pony HUD Error]', error instanceof Error ? error.message : error);
    log.error('HUD error', error instanceof Error ? error : { error });
  }
}

// Export for programmatic use
export { main };
