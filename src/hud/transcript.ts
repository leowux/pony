/**
 * Transcript Parser
 *
 * Parse Claude Code transcript JSONL to extract tool/skill/agent usage counts.
 * Counts total calls (not unique types).
 */

import { existsSync, readFileSync } from 'fs';

export interface TranscriptStats {
  toolCallCount: number;
  skillCallCount: number;
  agentCallCount: number;
  sessionStart?: Date;
  /** Cumulative input tokens */
  inputTokens: number;
  /** Cumulative output tokens */
  outputTokens: number;
  /** Cumulative cache creation tokens */
  cacheCreationTokens: number;
  /** Cumulative cache read tokens */
  cacheReadTokens: number;
}

/**
 * Parse transcript JSONL file and extract stats.
 * Returns total call counts and session start time.
 */
export function parseTranscript(transcriptPath: string | null): TranscriptStats {
  const result: TranscriptStats = {
    toolCallCount: 0,
    skillCallCount: 0,
    agentCallCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };

  if (!transcriptPath || !existsSync(transcriptPath)) {
    return result;
  }

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);

        // Capture session start from first entry timestamp
        if (!result.sessionStart && entry.timestamp) {
          result.sessionStart = new Date(entry.timestamp);
        }

        // Accumulate token usage from message.usage
        if (entry.message?.usage) {
          const usage = entry.message.usage;
          result.inputTokens += usage.input_tokens || 0;
          result.outputTokens += usage.output_tokens || 0;
          result.cacheCreationTokens += usage.cache_creation_input_tokens || 0;
          result.cacheReadTokens += usage.cache_read_input_tokens || 0;
        }

        // Tool use blocks are nested in message.content[]
        if (entry.message?.content && Array.isArray(entry.message.content)) {
          for (const block of entry.message.content) {
            if (block.type === 'tool_use' && block.name) {
              // Count total tool calls
              result.toolCallCount++;

              // Count Skill invocations
              if (block.name === 'Skill') {
                result.skillCallCount++;
              }

              // Count Agent/Task invocations
              if (block.name === 'Agent' || block.name === 'Task') {
                result.agentCallCount++;
              }
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    return result;
  } catch {
    return result;
  }
}
