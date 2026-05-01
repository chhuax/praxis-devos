## Context

当前 Praxis DevOS 投放内容分为三类：

- 项目根 managed block：负责 OpenSpec flow selection、stage gates 和 OpenSpec + SuperPowers contract。
- OpenSpec workflow skills：负责 `explore`、`propose`、`apply`、`archive` 等阶段行为。
- 内置 skills：负责可复用能力，例如 `devos-docs` 和 `devos-change-docs`。

`andrej-karpathy-skills` 的价值集中在日常编码行为：先理解任务、少做假设、保持实现简洁、只改必要位置、用测试或命令验证结果。这类内容应投放给 agent 作为编码任务的触发式 skill，而不是塞进项目根 managed block。

## Goals / Non-Goals

**Goals:**

- 新增一份 Praxis 内置 `karpathy-guidelines` skill 资源，内容保留官方 `karpathy-guidelines` skill，覆盖编码、修 bug、重构和评审准备中的轻量行为准则。
- 将 managed block 压缩为短路由与短 contract，移除非执行性的维护提示，并在 contract 中加入一条激活规则，要求相关任务加载该 skill；不支持显式 skill 调用的 agent 需内联执行同名准则。
- 准则保留外部仓库官方 `SKILL.md` 内容，Praxis 只负责投影和激活。
- 确保 `setup` / `update` / `projectNativeSkills()` 现有投影机制能自然发现和投放该 skill。
- 增加测试，防止新增 skill 未被收集或投影时静默失效。

**Non-Goals:**

- 不把 `forrestchang/andrej-karpathy-skills` 作为运行时依赖、submodule 或默认外部 pack。
- 不新增 CLI 参数或 pack 安装逻辑。
- 不改变 OpenSpec proposal/apply gate 的职责边界。
- 不复制外部 README 或 `CLAUDE.md`；`SKILL.md` 保留官方 `karpathy-guidelines` 内容。

## Decisions

1. **用内置 skill 承载编码准则，而不是扩大 managed block。**

   备选方案是在 `src/templates/managed-entry.md` 里加入完整准则。该方案投放面最广，但会让项目根规则变长，并混淆“流程治理”和“编码习惯”。最终采用“managed block 只保留短路由和短 contract，skill 放完整执行规则”的组合：always-on 内容负责触发，skill 负责承载细节。

2. **Praxis 资源名与官方 skill 名统一为 `karpathy-guidelines`。**

   资源目录名、投影路径、managed block 激活名、文件内部 frontmatter 都使用上游官方 `karpathy-guidelines`，避免投放后出现两个名字。

3. **内容结构采用短 checklist，而不是长篇原则文章。**

   Praxis 投放给 agent 的 skill 应便于执行。建议结构为：触发条件、执行规则、完成标准、与 OpenSpec 的边界。每条规则应能映射到实际行为，例如“改动前确认相关文件”“保持实现范围贴合请求”“验证后再声称完成”。

4. **不新增 pack 支持逻辑。**

   当前外部仓库已符合 `skills/<name>/SKILL.md` flat layout，可通过 `install-pack` 独立安装。此次变更目标是内置吸收原则，不需要改变 pack resolver。

## Risks / Trade-offs

- **Risk: 规则与 OpenSpec/SuperPowers 重复** → Mitigation: skill 明确定位为“日常编码执行准则”，不定义 proposal/apply/archive 流程。
- **Risk: agent 对每个小任务都过度停顿** → Mitigation: 内容强调“按风险缩放”，小改动可用轻量检查，大改动仍交给 OpenSpec gate。
- **Risk: 只投放 skill 但未触发** → Mitigation: managed block 增加激活规则，并为不支持显式 skill 调用的 agent 提供内联 fallback。
- **Risk: 外部来源版权或表达耦合** → Mitigation: 上游 skill frontmatter 声明 `license: MIT`；保留官方 skill 内容，不引入外部仓库作为运行时依赖。
- **Risk: 新 skill 加入后未被投放** → Mitigation: 增加测试验证 bundled skill source 收集和 Codex 投影结果。

## Migration Plan

实现后，用户运行 `npx praxis-devos update` 或 `setup` 时会自动刷新内置 skill 投影。已有项目根 managed block 不需要迁移。

回滚时删除 `assets/skills/karpathy-guidelines/SKILL.md` 和对应测试即可；投影层的 stale cleanup 会在后续刷新中清理带 Praxis marker 的旧投影。

## Open Questions

- 无阻塞问题。managed block 只保留短路由与短 contract，完整 checklist 仍由 `karpathy-guidelines` skill 承载；外层 marker 已足够表达 Praxis 管理边界。
