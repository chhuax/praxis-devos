# Codemap: CLI And Commands

## 用途

这份 codemap 聚焦 CLI 层，帮助快速定位：

- 命令是怎么解析的
- 命令最终调用哪个函数
- 改一个新命令需要动哪些位置
- 哪些测试会跟着变

## 主入口

- CLI 启动入口：[bin/praxis-devos.js](/Users/huaxin/Documents/workspace/praxis-devos/bin/praxis-devos.js)
- 命令解析和分发：[src/core/praxis-devos.js](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)

## 命令流转

```text
bin/praxis-devos.js
  -> runCli(argv)
     -> parseCliArgs(argv)
     -> 根据 parsed.command 分发
        -> statusProject()
        -> doctorProject()
        -> bootstrapProject()
        -> setupProject()
        -> syncProject()
        -> migrateProject()
        -> validateSessionTranscript()
        -> handleValidateChangeCommand()
        -> handleRecordSelectionCommand()
        -> handleRecordCapabilityCommand()
```

## 最关键的函数

### 参数解析

- [parseCliArgs](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)

职责：

- 解析 `--agent`、`--agents`
- 解析 `--project-dir`
- 解析 `--file`、`--change-id`、`--stage`
- 保持默认值

### 帮助文本

- [renderHelp](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)

职责：

- 维护 CLI 对外面
- 新增命令时必须同步修改

### 分发

- [runCli](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)

职责：

- 把 `parsed.command` 分发给具体实现
- CLI 子命令如果新增，通常要改这里

## 关键项目命令

### 初始化 / 同步类

- `setup`
- `init`
- `sync`
- `migrate`

相关函数都在 [src/core/praxis-devos.js](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)

### 诊断 / 校验类

- `status`
- `doctor`
- `bootstrap`
- `validate-session`
- `validate-change`

### Monitoring 记录类

- `instrumentation`
- `record-selection`
- `record-capability`

其中 monitoring 子命令最终走：

- [src/monitoring/commands.js](/Users/huaxin/Documents/workspace/praxis-devos/src/monitoring/commands.js)

## 改命令时的固定联动

新增或修改命令时，通常至少要联动这些位置：

1. [parseCliArgs](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)
2. [renderHelp](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)
3. [runCli](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)
4. [test/praxis-devos.test.js](/Users/huaxin/Documents/workspace/praxis-devos/test/praxis-devos.test.js)

## 测试入口

优先看这些测试：

- `renderHelp reflects the current CLI surface`
- `parseCliArgs parses current flags and rejects removed --openspec`
- `runCli routes ...`

文件：

- [test/praxis-devos.test.js](/Users/huaxin/Documents/workspace/praxis-devos/test/praxis-devos.test.js)

## 常见改动路径

### 加一个新 CLI 子命令

先改：

- [src/core/praxis-devos.js](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)

再补：

- [test/praxis-devos.test.js](/Users/huaxin/Documents/workspace/praxis-devos/test/praxis-devos.test.js)

### 改 setup/sync 行为

先看：

- [setupProject](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)
- [syncProject](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)
- [projectPaths](/Users/huaxin/Documents/workspace/praxis-devos/src/core/praxis-devos.js)

