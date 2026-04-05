# Pony

[![npm version](https://img.shields.io/npm/v/pony-cli.svg)](https://www.npmjs.com/package/pony-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Pony** 是一个专为 [Claude Code](https://claude.ai/code) 会话设计的任务管理插件。它提供基于文件的任务存储，支持依赖追踪、状态转换和实时 HUD（抬头显示）状态栏渲染。

[English](./README.md)

## 功能特性

- **任务管理** - 创建、追踪和管理任务，支持优先级、依赖和标签
- **HUD 状态栏** - 实时可视化会话状态、任务进度和代理活动
- **代理路由** - 根据标签自动将任务分配给专门的代理
- **CLI + 插件** - 可作为独立 CLI 使用，或作为 Claude Code 插件集成
- **全局存储** - 所有数据存储在 `~/.pony/`，支持跨项目访问

## 安装方式

### 作为 Claude Code 插件

```bash
# 将 Pony 添加为本地市场
claude plugin marketplace add /path/to/pony --scope user

# 安装插件
claude plugin install pony@pony
```

### 作为独立 CLI

```bash
# 直接使用 npx（无需安装）
npx pony-cli init

# 或全局安装
npm install -g pony-cli
```

## 快速开始

```bash
# 初始化 Pony
pony init

# 创建任务
pony add "实现认证功能" -p high -t implement

# 列出所有任务
pony list

# 获取下一个待处理任务
pony next

# 更新任务状态
pony update task_20260405_123456_789 -s running
```

## CLI 命令

### 任务命令

| 命令 | 描述 |
|------|------|
| `pony add <标题>` | 创建新任务 |
| `pony list` | 列出所有任务及统计 |
| `pony get <任务ID>` | 显示任务详情 |
| `pony update <任务ID>` | 更新任务属性 |
| `pony delete [任务ID]` | 删除任务或批量删除已完成任务 |
| `pony next` | 获取下一个可开始的任务 |

### 系统命令

| 命令 | 描述 |
|------|------|
| `pony init` | 初始化 Pony 存储 |
| `pony hud [操作]` | 管理 HUD 状态栏 |
| `pony logs` | 查看日志（支持过滤） |

### 任务选项

**`pony add`**
- `-p, --priority <级别>` - 优先级：`high`、`medium`、`low`
- `-d, --depends-on <IDs>` - 依赖任务 ID
- `-t, --tag <标签>` - 用于代理路由的标签
- `-o, --owner <名称>` - 分配负责人
- `--desc <文本>` - 任务描述
- `--project <路径>` - 项目关联

**`pony list`**
- `-s, --status <状态>` - 按状态筛选
- `-o, --owner <名称>` - 按负责人筛选
- `-p, --project <名称>` - 按项目筛选
- `--summary` - 仅显示统计信息
- `--json` - JSON 格式输出

**`pony update`**
- `-s, --status <状态>` - 新状态
- `-p, --priority <级别>` - 新优先级
- `-t, --title <标题>` - 新标题
- `--owner <名称>` - 新负责人

### 任务状态转换

| 从 | 到 |
|----|-----|
| `pending` | `running`、`cancelled` |
| `running` | `completed`、`pending`、`cancelled` |
| `completed` | `pending`（重开） |
| `cancelled` | `pending`（激活） |

## HUD 状态栏

Pony 为 Claude Code 状态栏提供两行 HUD 显示：

```
[Pony] | session: 15m | ctx: 45% | agents: 2 | tools: 12 | skills: 1
tasks: 5 total | pending: 2 | running: 1 | completed: 2
```

### 颜色渐变

| 元素 | 级别 |
|------|------|
| 会话时长 | 灰色 → 绿色(15m) → 蓝色(30m) → 黄色(45m) → 紫色(60m) → 红色(>60m) |
| 上下文 | 灰色(0%) → 绿色(35%) → 蓝色(50%) → 黄色(65%) → 紫色(80%) → 红色(>80%) |
| 代理数 | 绿色(1) → 蓝色(2) → 黄色(3) → 紫色(4) → 红色(5+) |
| 工具调用 | 绿色(1-9) → 蓝色(10-49) → 黄色(50-99) → 紫色(100-199) → 红色(200+) |

### HUD 命令

```bash
pony hud on      # 启用 HUD
pony hud off     # 禁用 HUD
pony hud status  # 显示配置
```

## 代理路由

任务根据标签自动路由到专门的代理：

| 标签 | 代理 | 模型 | 用途 |
|------|------|------|------|
| `plan`、`design`、`architecture` | planner | opus | 规划、需求分析 |
| `search`、`find`、`explore` | explorer | haiku | 代码搜索 |
| `verify`、`test`、`review` | verifier | sonnet | 测试、验证 |
| `implement`、`code`、`fix` | executor | sonnet | 实现 |

### 默认流程

无特殊标签的任务遵循：**planner → executor → verifier**

## 插件 Skills

作为 Claude Code 插件安装后，Pony 提供以下 skills：

| Skill | 描述 |
|-------|------|
| `/pony:init` | 为当前会话初始化 Pony |
| `/pony:task` | 任务管理操作 |
| `/pony:hud` | HUD 配置 |
| `/pony:run` | 执行任务编排循环 |

## 数据存储

所有数据全局存储在 `~/.pony/`：

```
~/.pony/
├── tasks/
│   ├── index.json           # 任务计数、项目列表
│   └── task_YYYYMMDD_HHMMSS_mmm/
│       ├── task.json        # 任务定义
│       └── state.json       # 任务状态
├── hud/
│   └── state.json           # HUD 会话状态
├── logs/
│   └── pony-YYYY-MM-DD.log  # 每日日志
├── config.json              # 配置文件
└── cache/                   # 缓存目录
```

## 开发指南

```bash
pnpm install     # 安装依赖
pnpm build       # 构建 library/CLI
pnpm test        # 运行测试
pnpm check       # 格式化 + lint + 类型检查
pnpm clean       # 清理 dist/
```

本地运行 CLI：

```bash
node dist/cli/index.mjs <命令>
```

## 许可证

MIT © wuwenbang