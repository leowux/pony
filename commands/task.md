# Pony Task Commands

Pony 提供以下任务管理命令：

## 命令列表

### `pony add <title>` - 创建任务

创建一个新任务。

```bash
pony add "任务标题" --priority high --tag implement
```

选项：

- `-p, --priority <priority>` - 优先级 (high, medium, low)
- `-t, --tag <tags...>` - 标签
- `-o, --owner <owner>` - 负责人
- `--desc <description>` - 描述

### `pony list` - 列出任务

以表格形式显示所有任务。

```bash
pony list --status pending --summary
```

选项：

- `-s, --status <status>` - 按状态筛选
- `-o, --owner <owner>` - 按负责人筛选
- `--summary` - 显示统计信息
- `--json` - JSON 格式输出

### `pony get <taskId>` - 查看详情

显示任务的详细信息。

```bash
pony get task_20260405_xxx
```

### `pony update <taskId>` - 更新任务

更新任务属性，包括状态切换。

```bash
pony update task_xxx --status running
pony update task_xxx --priority high
```

选项：

- `-s, --status <status>` - 状态 (pending, running, completed, cancelled)
- `-p, --priority <priority>` - 优先级
- `-t, --title <title>` - 标题
- `--owner <owner>` - 负责人

状态转换规则：

- pending → running, cancelled
- running → completed, pending, cancelled
- completed → pending (重开)
- cancelled → pending (激活)

### `pony delete [taskId]` - 删除任务

删除单个任务或批量删除。

```bash
pony delete task_xxx
pony delete --completed
```

选项：

- `--completed` - 删除所有已完成任务

### `pony next` - 下一个任务

获取下一个待处理的任务。

```bash
pony next --json
```

选项：

- `--json` - JSON 格式输出

## 任务状态

| 状态      | 颜色 | 说明   |
| --------- | ---- | ------ |
| pending   | 黄色 | 待处理 |
| running   | 蓝色 | 进行中 |
| completed | 绿色 | 已完成 |
| cancelled | 灰色 | 已取消 |

## 任务优先级

| 优先级 | 颜色 |
| ------ | ---- |
| high   | 红色 |
| medium | 黄色 |
| low    | 蓝色 |

## 快捷操作

```bash
# 创建并开始
pony add "紧急修复" -p high && pony update $(pony next --json | jq -r '.id') -s running

# 完成当前任务
pony update $(pony next --json | jq -r '.id') -s completed

# 清理已完成
pony delete --completed
```

## 数据存储

所有任务存储在 `~/.pony/tasks/` 目录。

```
~/.pony/tasks/
├── task_20260405_xxx/
│   ├── task.json      # 任务数据
│   └── state.json     # 状态数据
```
