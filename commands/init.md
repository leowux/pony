---
description: Initialize Pony task management system
argument-hint: ''
---

Initialize Pony task management system.

```bash
pony init
```

### What it does

1. Checks if Pony is installed globally
2. Shows installation instructions if not installed
3. Initializes the global storage directory (~/.pony/)

### Installation

If Pony CLI is not installed, install it from npm:

```bash
npm install -g pony-cli
# or
pnpm add -g pony-cli
```

### Global Storage

Pony stores all data in `~/.pony/`:

```
~/.pony/
├── tasks/          # Task files
├── logs/           # Log files
├── config.json     # Configuration
└── hud/            # HUD state
```

### Examples

- `/pony:init` - Initialize or check Pony installation
