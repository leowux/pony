# Pony Task Commands

Pony provides the following task management commands:

## Command List

### `pony add <title>` - Create Task

Create a new task.

```bash
pony add "Task title" --priority high --tag implement
```

Options:

- `-p, --priority <priority>` - Priority (high, medium, low)
- `-t, --tag <tags...>` - Tags
- `-o, --owner <owner>` - Owner
- `--desc <description>` - Description

### `pony list` - List Tasks

Display all tasks in table format.

```bash
pony list --status pending --summary
```

Options:

- `-s, --status <status>` - Filter by status
- `-o, --owner <owner>` - Filter by owner
- `-p, --project <name>` - Filter by project name
- `--summary` - Show statistics only
- `--json` - JSON output

### `pony get <taskId>` - View Details

Display detailed task information.

```bash
pony get task_20260405_xxx
```

### `pony update <taskId>` - Update Task

Update task properties, including status transitions.

```bash
pony update task_xxx --status running
pony update task_xxx --priority high
```

Options:

- `-s, --status <status>` - Status (pending, running, completed, cancelled)
- `-p, --priority <priority>` - Priority
- `-t, --title <title>` - Title
- `--owner <owner>` - Owner

Status Transition Rules:

- pending → running, cancelled
- running → completed, pending, cancelled
- completed → pending (reopen)
- cancelled → pending (activate)

### `pony delete [taskId]` - Delete Task

Delete a single task or bulk delete.

```bash
pony delete task_xxx
pony delete --completed
```

Options:

- `--completed` - Delete all completed tasks

### `pony next` - Next Task

Get the next pending task ready to process.

```bash
pony next --json
```

Options:

- `--json` - JSON output

## Task Status

| Status    | Color  | Description |
| --------- | ------ | ----------- |
| pending   | Yellow | Pending     |
| running   | Blue   | In Progress |
| completed | Green  | Completed   |
| cancelled | Gray   | Cancelled   |

## Task Priority

| Priority | Color  |
| -------- | ------ |
| high     | Red    |
| medium   | Yellow |
| low      | Blue   |

## Quick Operations

```bash
# Create and start
pony add "Urgent fix" -p high && pony update $(pony next --json | jq -r '.id') -s running

# Complete current task
pony update $(pony next --json | jq -r '.id') -s completed

# Cleanup completed
pony delete --completed
```

## Data Storage

All tasks are stored in `~/.pony/tasks/` directory.

```
~/.pony/tasks/
├── task_20260405_xxx/
│   ├── task.json      # Task data
│   └── state.json     # State data
```