# Pony CLI

Lightweight task management for Claude Code sessions.

## Installation

```bash
npm install -g pony-cli
```

## Usage

```bash
pony <command> [options]
```

## Commands

### Task Management

#### `pony add <title>`

Create a new task.

Options:

- `-p, --priority <priority>` - Task priority (high, medium, low), default: medium
- `-d, --depends-on <taskIds...>` - Task dependencies (space-separated IDs)
- `-t, --tag <tags...>` - Task tags (space-separated)
- `-o, --owner <owner>` - Task owner/agent
- `--desc <description>` - Task description
- `--project <path>` - Project path, default: current directory

Example:

```bash
pony add "Fix login bug" -p high -t bug auth
```

#### `pony list`

List all tasks with progress summary.

Options:

- `-s, --status <status>` - Filter by status
- `-o, --owner <owner>` - Filter by owner
- `-p, --project <name>` - Filter by project name
- `--json` - Output as JSON

#### `pony get <taskId>`

Show task details.

#### `pony update <taskId>`

Update task properties.

Options:

- `-s, --status <status>` - New status
- `-p, --priority <priority>` - New priority
- `-t, --title <title>` - New title
- `--owner <owner>` - New owner

#### `pony start <taskId>`

Start working on a task.

Options:

- `--owner <owner>` - Assign owner

#### `pony complete <taskId>`

Mark a task as completed.

#### `pony cancel <taskId>`

Cancel a task.

#### `pony delete <taskId>`

Delete a task permanently.

### Status & Navigation

#### `pony status`

Show task system status summary.

Options:

- `-p, --project <path>` - Project path, default: current directory

#### `pony next`

Show the next task ready to start (considering dependencies).

### Cleanup

#### `pony clear`

Clear all completed tasks.

#### `pony cleanup`

Clean up old logs and cache.

### HUD

#### `pony hud`

Run the HUD statusline for Claude Code.

### Logs

#### `pony logs`

View logs.

Options:

- `-f, --follow` - Follow log output (tail -f style)
- `-l, --level <level>` - Filter by log level (debug, info, warn, error)
- `-n, --lines <number>` - Number of lines to show, default: 50
- `--clean` - Clean old log files

### Help

#### `pony help [command]`

Show help for a command or general help.

## Data Storage

All data is stored globally in `~/.pony/`:

```
~/.pony/
├── tasks/
│   ├── index.json    # nextId counter
│   ├── 1.json        # task files
│   └── 2.json
└── state/
    └── hud-state.json
```

## Global Options

- `--debug` - Enable debug logging
- `--version` - Show version
- `--help` - Show help

## Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build library/CLI
pnpm test          # Run tests
pnpm check         # Format + lint + typecheck
```

## License

MIT
