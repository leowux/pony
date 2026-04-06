/**
 * Pony Configuration Management
 *
 * Global config stored in ~/.pony/config.json
 */

import { existsSync, readFileSync } from 'fs';
import {
  DEFAULT_PONY_CONFIG,
  PRESET_CONFIGS,
  type PonyConfig,
  type PonyHudElementConfig,
} from '../types.js';
import { getConfigPath, getGlobalPonyRoot } from './worktree-paths.js';
import { atomicWriteJson, ensureDir } from './atomic-write.js';
import { createLogger } from './logger.js';

const log = createLogger({ module: 'config' });

/**
 * Read global Pony config.
 * Returns default config if file doesn't exist or is invalid.
 */
export function readHudConfig(): PonyConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    log.debug('Config file not found, using defaults');
    return DEFAULT_PONY_CONFIG;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as Partial<PonyConfig>;
    // Merge with defaults to ensure all fields exist
    return {
      hud: { ...DEFAULT_PONY_CONFIG.hud, ...config.hud },
      tasks: { ...DEFAULT_PONY_CONFIG.tasks, ...config.tasks },
    };
  } catch (error) {
    log.warn('Failed to read config, using defaults', { error });
    return DEFAULT_PONY_CONFIG;
  }
}

/**
 * Write global Pony config.
 */
export function writeHudConfig(config: PonyConfig): void {
  const root = getGlobalPonyRoot();
  ensureDir(root);
  const configPath = getConfigPath();
  atomicWriteJson(configPath, config);
  log.debug('Config written', { path: configPath });
}

/**
 * Update HUD config (partial update).
 * Merges updates with existing config and writes.
 */
export function updateHudConfig(updates: Partial<PonyConfig['hud']>): PonyConfig {
  const existing = readHudConfig();
  const updated: PonyConfig = {
    ...existing,
    hud: {
      ...existing.hud,
      ...updates,
    },
  };
  writeHudConfig(updated);
  log.info('HUD config updated', { updates });
  return updated;
}

/**
 * Check if HUD is enabled.
 */
export function isHudEnabled(): boolean {
  return readHudConfig().hud.enabled;
}

/**
 * Apply a preset to HUD config.
 * Merges preset elements with existing config.
 */
export function applyHudPreset(preset: PonyConfig['hud']['preset']): PonyConfig {
  const existing = readHudConfig();
  const presetElements = PRESET_CONFIGS[preset];

  const updated: PonyConfig = {
    ...existing,
    hud: {
      ...existing.hud,
      preset,
      elements: {
        ...existing.hud.elements,
        ...presetElements,
      },
    },
  };
  writeHudConfig(updated);
  log.info('HUD preset applied', { preset });
  return updated;
}

/**
 * Update specific HUD element visibility.
 */
export function updateHudElement(
  element: keyof PonyHudElementConfig,
  enabled: boolean,
): PonyConfig {
  const existing = readHudConfig();
  const updated: PonyConfig = {
    ...existing,
    hud: {
      ...existing.hud,
      elements: {
        ...existing.hud.elements,
        [element]: enabled,
      },
    },
  };
  writeHudConfig(updated);
  log.info('HUD element updated', { element, enabled });
  return updated;
}

/**
 * Bulk update HUD elements.
 */
export function updateHudElements(elements: Partial<PonyHudElementConfig>): PonyConfig {
  const existing = readHudConfig();
  const updated: PonyConfig = {
    ...existing,
    hud: {
      ...existing.hud,
      elements: {
        ...existing.hud.elements,
        ...elements,
      },
    },
  };
  writeHudConfig(updated);
  log.info('HUD elements bulk updated', { elements });
  return updated;
}
