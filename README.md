# Pony

[![npm version](https://img.shields.io/npm/v/pony-cli.svg)](https://www.npmjs.com/package/pony-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Pony** is a task management plugin for [Claude Code](https://claude.ai/code) sessions. It provides file-based task storage with dependency tracking, status transitions, and a real-time HUD (Heads-Up Display) for statusline rendering.

[中文文档](./README_CN.md)

## Features

- **Task Management** - Create, track, and manage tasks with priorities, dependencies, and tags
- **HUD Statusline** - Real-time visualization of session state, task progress, and agent activity
- **Agent Routing** - Automatic task delegation to specialized agents based on tags
- **CLI + Plugin** - Use standalone CLI or integrate with Claude Code as a plugin
- **Global Storage** - All data stored in `~/.pony/` for cross-project access

## Installation

### As Claude Code Plugin

```bash
# Add Pony marketplace
claude plugin marketplace add https://github.com/leowux/pony --scope user

# Install the plugin
claude plugin install pony
```

### As Standalone CLI

```bash
# Use directly with npx (no installation required)
npx pony-cli init

# Or install globally
npm install -g pony-cli
```

## Quick Start

```bash
# Initialize Pony
pony init

# Create a task
pony add "Implement authentication" -p high -t implement

# List all tasks
pony list

# Get next ready task
pony next

# Update task status
pony update task_20260405_123456_789 -s running
```

## CLI Commands

### Task Commands

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `pony add <title>`     | Create a new task                    |
| `pony list`            | List all tasks with summary          |
| `pony get <taskId>`    | Show task details                    |
| `pony update <taskId>` | Update task properties               |
| `pony delete [taskId]` | Delete task or bulk delete completed |
| `pony next`            | Get next task ready to start         |

### System Commands

| Command             | Description              |
| ------------------- | ------------------------ |
| `pony init`         | Initialize Pony storage  |
| `pony hud [action]` | Manage HUD statusline    |
| `pony logs`         | View logs with filtering |

### Task Options

**`pony add`**

- `-p, --priority <level>` - Priority: `high`, `medium`, `low`
- `-d, --depends-on <ids>` - Dependency task IDs
- `-t, --tag <tags>` - Tags for agent routing
- `-o, --owner <name>` - Assign owner
- `--desc <text>` - Task description
- `--project <path>` - Project association

**`pony list`**

- `-s, --status <status>` - Filter by status
- `-o, --owner <name>` - Filter by owner
- `-p, --project <name>` - Filter by project
- `--summary` - Show statistics only
- `--json` - JSON output

**`pony update`**

- `-s, --status <status>` - New status
- `-p, --priority <level>` - New priority
- `-t, --title <title>` - New title
- `--owner <name>` - New owner

### Task Status Transitions

| From        | To                                  |
| ----------- | ----------------------------------- |
| `pending`   | `running`, `cancelled`              |
| `running`   | `completed`, `pending`, `cancelled` |
| `completed` | `pending` (reopen)                  |
| `cancelled` | `pending` (reactivate)              |

## HUD Statusline

Pony provides a two-line HUD for Claude Code statusline:

```
[Pony] | session: 15m | ctx: 45% | agents: 2 | tools: 12 | skills: 1
tasks: 5 total | pending: 2 | running: 1 | completed: 2
```

### Color Gradients

| Element | Levels                                                                           |
| ------- | -------------------------------------------------------------------------------- |
| Session | Gray → Green (15m) → Blue (30m) → Yellow (45m) → Magenta (60m) → Red (>60m)      |
| Context | Gray (0%) → Green (35%) → Blue (50%) → Yellow (65%) → Magenta (80%) → Red (>80%) |
| Agents  | Green (1) → Blue (2) → Yellow (3) → Magenta (4) → Red (5+)                       |
| Tools   | Green (1-9) → Blue (10-49) → Yellow (50-99) → Magenta (100-199) → Red (200+)     |

### HUD Commands

```bash
pony hud on      # Enable HUD
pony hud off     # Disable HUD
pony hud status  # Show configuration
```

## Agent Routing

Tasks are automatically routed to specialized agents based on tags:

| Tag                              | Agent    | Model  | Use Case               |
| -------------------------------- | -------- | ------ | ---------------------- |
| `plan`, `design`, `architecture` | planner  | opus   | Planning, requirements |
| `search`, `find`, `explore`      | explorer | haiku  | Code search            |
| `verify`, `test`, `review`       | verifier | sonnet | Testing, validation    |
| `implement`, `code`, `fix`       | executor | sonnet | Implementation         |

### Default Pipeline

Tasks without special tags follow: **planner → executor → verifier**

## Plugin Skills

When installed as a Claude Code plugin, Pony provides these skills:

| Skill        | Description                         |
| ------------ | ----------------------------------- |
| `/pony:init` | Initialize Pony for current session |
| `/pony:task` | Task management operations          |
| `/pony:hud`  | HUD configuration                   |
| `/pony:run`  | Execute task orchestration loop     |

## Data Storage

All data is stored globally in `~/.pony/`:

```
~/.pony/
├── tasks/
│   ├── index.json           # Task count, projects
│   └── task_YYYYMMDD_HHMMSS_mmm/
│       ├── task.json        # Task definition
│       └── state.json       # Task state
├── hud/
│   └── state.json           # HUD session state
├── logs/
│   └── pony-YYYY-MM-DD.log  # Daily logs
├── config.json              # Configuration
└── cache/                   # Cache directory
```

## Development

```bash
pnpm install     # Install dependencies
pnpm build       # Build library/CLI
pnpm test        # Run tests
pnpm check       # Format + lint + typecheck
pnpm clean       # Remove dist/
```

Run CLI locally:

```bash
node dist/cli/index.mjs <command>
```

## License

MIT © leowux
