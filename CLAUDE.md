# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pony is a lightweight task management CLI tool for Claude Code sessions. It provides file-based task storage with dependency tracking, status transitions, and a HUD (Heads-Up Display) for statusline rendering.

## Commands

```bash
pnpm build      # Build library/CLI (vp pack - tsdown)
pnpm dev        # Watch mode build
pnpm test       # Run tests (Vitest)
pnpm test run   # Run tests once (no watch)
pnpm lint       # Lint code (Oxlint)
pnpm fmt        # Format code (Oxfmt)
pnpm check      # Combined format + lint + typecheck
pnpm typecheck  # TypeScript type checking
pnpm clean      # Remove dist/
```

Run CLI locally: `node dist/cli/index.mjs <command>`

## Architecture

### Core Modules

- **`src/tasks/`** - Task management layer
  - `task-file-ops.ts` - Low-level CRUD operations on JSON files
  - `task-manager.ts` - High-level business logic with validation, status transitions, dependency checks

- **`src/hud/`** - HUD rendering for Claude Code statusline
  - Reads stdin from Claude Code for context (cwd, model, context window)
  - Renders task status, session duration, agent count

- **`src/lib/`** - Utilities
  - `atomic-write.ts` - Temp-then-rename pattern for safe file writes
  - `worktree-paths.ts` - Path resolution within `.pony/` storage directory

### Data Storage

All data stored in `.pony/` directory:

```
.pony/
├── tasks/
│   ├── index.json    # nextId counter
│   ├── 1.json        # task files
│   └── 2.json
└── state/
    └── hud-state.json
```

### Key Patterns

- **Atomic writes**: All file writes use temp-then-rename to prevent corruption
- **Status transitions**: Validated state machine (pending → running → completed/cancelled)
- **Dependency resolution**: Tasks block on uncompleted dependencies
- **Path sanitization**: Task IDs validated to prevent traversal attacks

## Vite+ Toolchain

Uses Vite+ unified toolchain:

- `vp pack` - Library builds via tsdown (not `vp build` which is for web apps)
- `vp lint` - Oxlint (faster ESLint replacement)
- `vp fmt` - Oxfmt (faster Prettier replacement)
- `vp test` - Vitest

Config in `vite.config.ts` with `pack`, `lint`, `fmt`, `test`, `staged` blocks.

## Development Workflow

After modifying code, always run `pnpm run check` to verify format, lint, and type checks pass.

## Plugin Configuration

### Plugin Structure

```
.claude-plugin/
├── plugin.json       # Plugin manifest
└── marketplace.json  # Marketplace definition (required for local plugins)
```

### Valid Hook Types

Only these hook types are supported in `hooks/hooks.json`:

- `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`
- `PostToolUseFailure`, `PermissionRequest`, `SubagentStart`, `SubagentStop`
- `PreCompact`, `Stop`, `SessionEnd`

**Note**: `StatusLineUpdate` is NOT a valid hook type. Statusline configuration must be set in `~/.claude/settings.json`, not `plugin.json`.

### Plugin.json Restrictions

- `hooks/hooks.json` is auto-loaded - do NOT add `"hooks": "./hooks/hooks.json"` to plugin.json (causes duplicate load error)
- `agents` field requires proper agent format, not markdown files
- `statusline` field is not recognized in plugin.json

### Marketplace Requirement

Local plugins must have a `marketplace.json` file and be registered as a marketplace:

```bash
claude plugin marketplace add /path/to/pony --scope user
claude plugin install pony@pony
```

### Common Plugin Errors

| Error                                   | Cause                                                 | Fix                                 |
| --------------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| "Plugin not found in marketplace local" | Plugin installed as `@local` but no local marketplace | Add marketplace.json, reinstall     |
| "Duplicate hooks file detected"         | `hooks/hooks.json` referenced in plugin.json          | Remove hooks field from plugin.json |
| "Unrecognized key: statusline"          | statusline in plugin.json                             | Move to settings.json               |
| "Invalid key in record" for hooks       | Invalid hook type like `StatusLineUpdate`             | Use valid hook types only           |

## CI/CD

### Workflows

- **CI** (`.github/workflows/ci.yml`) - Runs on push/PR to main
  - `pnpm check` - Format, lint, typecheck
  - `pnpm test` - Run tests
  - `pnpm build` - Build verification

- **Release** (`.github/workflows/release.yml`) - Automated npm publishing
  - Triggered by: push of `v*` tags OR manual workflow_dispatch
  - Runs quality checks before publishing
  - Uses `release-it` for version management

### Release Process

**Option 1: Push version tag (automatic)**

```bash
git tag v0.0.2
git push origin v0.0.2
```

**Option 2: Manual trigger via GitHub Actions**

1. Go to Actions → Release → Run workflow
2. Select version type (patch/minor/major)
3. Workflow runs release-it (bumps version, creates tag, publishes)

### Conventional Commits

This project uses conventional commits for automatic version detection:

| Type                         | Version Bump |
| ---------------------------- | ------------ |
| `feat:`                      | MINOR        |
| `fix:`, `perf:`, `refactor:` | PATCH        |
| `BREAKING CHANGE:`           | MAJOR        |

### Required Secrets

- `NPM_TOKEN` - npm registry access token (configured in repo Settings → Secrets)
