---
description: Manage HUD statusline settings for Claude Code
argument-hint: '<on|off|status|config> [options]'
---

# Pony HUD Commands

Manage HUD statusline settings for Claude Code.

## pony hud

Basic HUD control commands.

```bash
pony hud [action]
```

### Actions

| Action   | Description                                |
| -------- | ------------------------------------------ |
| `on`     | Enable HUD display                         |
| `off`    | Disable HUD (complete silence - no output) |
| `status` | Show current HUD configuration             |
| (none)   | Run HUD rendering (used by statusline)     |

### Examples

```bash
pony hud on       # Enable HUD
pony hud off      # Disable HUD (no output at all)
pony hud status   # Show current status
```

## pony hud-config

Configure HUD display elements.

```bash
pony hud-config [action] [options]
```

Alias: `pony hud config`

### Actions

| Action                | Description                           |
| --------------------- | ------------------------------------- | ----------------------- |
| `show`                | Display current element configuration |
| `preset <name>`       | Apply a preset configuration          |
| `element <name> [--on | --off]`                               | Toggle specific element |

### Presets

| Preset    | Elements Shown                  |
| --------- | ------------------------------- |
| `minimal` | ponyLabel, context              |
| `focused` | all elements (including tokens) |
| `full`    | all elements (including tokens) |

### Elements

| Element           | Description                            |
| ----------------- | -------------------------------------- |
| `ponyLabel`       | `[Pony]` branding label                |
| `tasks`           | Task count summary line                |
| `currentTask`     | Currently active task                  |
| `sessionDuration` | Session elapsed time                   |
| `agents`          | Active agent count                     |
| `context`         | Context window usage percentage        |
| `tokens`          | Token consumption total (input+output) |

### Examples

```bash
# Show current configuration
pony hud-config show

# Apply presets
pony hud-config preset minimal    # Minimal display
pony hud-config preset focused    # Full display

# Toggle elements
pony hud-config element tasks --on      # Enable tasks
pony hud-config element agents --off    # Disable agents
pony hud-config element sessionDuration # Toggle (no flag = flip)
```

## Configuration File

HUD config is stored in `~/.pony/config.json`:

```json
{
  "hud": {
    "enabled": true,
    "preset": "focused",
    "elements": {
      "ponyLabel": true,
      "tasks": true,
      "currentTask": true,
      "sessionDuration": true,
      "agents": true,
      "context": true,
      "tokens": true
    },
    "maxOutputLines": 3
  }
}
```

## Statusline Integration

HUD runs automatically when configured in `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node $HOME/.claude/hud/pony-hud.mjs"
  }
}
```

When `pony hud off` is set, the statusline produces no output.
