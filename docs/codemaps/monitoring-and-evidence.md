# Codemap: Monitoring And Evidence

## 用途

这份 codemap 聚焦 monitoring / evidence 链路，帮助快速定位：

- capability 选择证据写到哪里
- `record-selection` / `record-capability` / `validate-change` 是怎么走的
- instrumentation overlay 如何注入到投影后的 skill

## 主链路

```text
runCli()
  -> record-selection / record-capability / validate-change / instrumentation
     -> src/monitoring/commands.js
        -> state-store.js 或 overlay.js
```

## 关键文件

### commands 层

- [src/monitoring/commands.js](../../src/monitoring/commands.js)

职责：

- 处理 instrumentation enable / disable / status
- 处理 `record-selection`
- 处理 `record-capability`
- 处理 `validate-change`

### evidence 存储层

- [src/monitoring/state-store.js](../../src/monitoring/state-store.js)

职责：

- 生成 project-state key
- 解析用户 home 下的 Praxis state 目录
- 创建 / 读取 / 写入 `evidence.json`
- 记录 stage 级 capability selection
- 校验每个 capability 的必需 evidence 字段

### overlay 层

- [src/monitoring/overlay.js](../../src/monitoring/overlay.js)

职责：

- 对已投影的 `opsx-*` skills 注入 monitoring overlay block
- 让 skill 文案里出现 `record-selection` / `record-capability` 的命令提示
- 可以恢复 clean projection

### 导出层

- [src/monitoring/index.js](../../src/monitoring/index.js)

职责：

- 重新导出 state-store、overlay、commands 中的入口

## 证据文件位置

不写到仓库里，而是写到用户 home 下的 Praxis state 目录：

- macOS / Linux:
  - `~/.praxis-devos/state/<project-key>/<change-id>/evidence.json`
- Windows:
  - `%LOCALAPPDATA%/PraxisDevOS/state/<project-key>/<change-id>/evidence.json`

project key 由：

- 项目绝对路径 hash
- 项目 basename

共同生成。

## capability 选择如何决定

capability policy 在：

- [src/core/capability-policy.js](../../src/core/capability-policy.js)

它定义：

- `explore`
- `propose`
- `apply`
- `archive`

各 stage 下，什么 signal 会触发哪些 capability。

## 改 monitoring 时的路由

### 改 evidence schema 或 required fields

先看：

- `REQUIRED_EVIDENCE_FIELDS` in [src/monitoring/state-store.js](../../src/monitoring/state-store.js)
- `validateEvidenceFields()`

### 改 selection 逻辑

先看：

- [src/core/capability-policy.js](../../src/core/capability-policy.js)
- `recordCapabilitySelection()`

### 改 overlay 注入文案

先看：

- `OVERLAY_BLOCKS`
- `insertOverlay()`
- [src/monitoring/overlay.js](../../src/monitoring/overlay.js)

## 关键事实

- monitoring overlay 不改仓库源 skill，只改投影后的 skill 文件
- overlay 注入前会先重新 project 一次，确保基线是干净 projection
- evidence 校验和 session transcript 校验是两条不同链路：
  - transcript 校验在 core 层
  - capability evidence 校验在 monitoring/state-store 层
