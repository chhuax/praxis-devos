## Why

当前仓库把 bundled assets 分散在 `assets/openspec-skills/`、`assets/devos-skills/`、`src/templates/claude-commands/` 和 `src/templates/opencode-commands/`，组织方式既不统一，也没有准确反映投放语义。更严重的是，skills 目前在发现逻辑上仍以 `SKILL.md` 为中心思考，但真实的 skill 应该是整个目录 bundle，而不是单文件。

## What Changes

- 统一 bundled skill 资产到 `assets/skills/<skill-name>/`
- 统一 bundled command 资产到 `assets/commands/*.md`
- 将 skill 投放语义改为“投放整个 skill bundle 目录”，而不是只处理 `SKILL.md`
- 将 command 投放语义改为“共享单文件资产 + 宿主差异仅体现在投放目标目录”
- 删除按来源或宿主拆分的旧资产目录
- 更新投影逻辑、managed asset tracking 和测试，使其与新的资产布局一致

## Capabilities

### New Capabilities
- `bundled-asset-layout`: 统一 bundled skills / commands 的资产目录结构和发现规则。

### Modified Capabilities
- `host-docs-command-adapters`: 调整 command 资产来源路径与投放发现逻辑，但不改变对外 command 行为。

## Impact

- 影响 `src/projection/index.js` 的 bundled asset discovery 逻辑
- 影响 Claude/OpenCode/Codex 的 skill 投放实现
- 影响 Claude/OpenCode command 模板读取路径
- 影响 managed asset manifest 中记录的 sourceDir 元数据
- 影响相关测试和少量资产路径文档
