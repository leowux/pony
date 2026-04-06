---
description: Run task orchestration with full agent pipeline
argument-hint: '[--max-iterations <n>] [--skip-verify]'
---

Run task orchestration with full agent pipeline.

## Usage

```
/pony:run
```

Loops until all pending tasks are processed.

## Workflow

Repeat until no pending tasks:

1. **Get next task**: Run `pony next --json`
2. **If null**: Stop, all tasks processed
3. **Start task**: Run `pony update <taskId> -s running`
4. **Route to agent**: Based on task tags (see routing table)
5. **Delegate**: Use Agent tool with appropriate subagent_type
6. **Complete task**: Run `pony update <taskId> -s completed`
7. **Repeat**: Go back to step 1

## Agent Routing

| Tag                                   | Agent         | Model  | Use Case                             |
| ------------------------------------- | ------------- | ------ | ------------------------------------ |
| `plan`, `design`, `architecture`      | pony:planner  | opus   | Planning, requirements, architecture |
| `search`, `find`, `explore`           | pony:explorer | haiku  | Code search, discovery               |
| `verify`, `test`, `review`            | pony:verifier | sonnet | Testing, validation, review          |
| `implement`, `code`, `fix` or no tags | pony:executor | sonnet | Implementation, bug fixes            |

### Default Pipeline

If no special tags, use **pony:planner → pony:executor → pony:verifier**:

1. **pony:planner** - Analyze task and create implementation plan
2. **pony:executor** - Implement the plan
3. **pony:verifier** - Verify the implementation works

## Implementation

Use Agent tool to delegate:

```
Agent(
  subagent_type="pony:planner",
  description="Plan task",
  prompt="Plan implementation for task #<id>: <title>

Description: <description>

Analyze requirements and create a step-by-step implementation plan."
)
```

After pony:planner completes, call pony:executor with the plan, then pony:verifier.

## Task Tags

Add tags when creating tasks:

```bash
pony add "Implement auth" -t implement
pony add "Search for API usage" -t search
pony add "Review PR #123" -t verify
pony add "Design new architecture" -t plan
```

## Examples

Single task execution:

- Task with `verify` tag → goes directly to pony:verifier agent

Full pipeline:

- Task with no tags → pony:planner → pony:executor → pony:verifier

Skip planning:

- Task with `implement` tag → goes directly to pony:executor → pony:verifier
