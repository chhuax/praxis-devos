## Context

当前仓库里的 bundled assets 分成了三套来源：

- `assets/openspec-skills/`
- `assets/devos-skills/`
- `src/templates/claude-commands/` 与 `src/templates/opencode-commands/`

这个布局的问题有三个：

1. **不反映真实投放语义**
   - skill 的真实单位是整个 skill bundle 目录，而不是单个 `SKILL.md`
   - command 的真实单位是共享 markdown 资产，而不是“按宿主复制两份”

2. **发现逻辑被来源分组污染**
   - 现在 `src/projection/index.js` 维护 `BUNDLED_SKILL_GROUPS`
   - 这会把“资产来源”错误地编码成“投放规则”

3. **重复资产增加维护成本**
   - Claude/OpenCode 的 docs command 模板内容相同，却保留了两份文件

这次变更的目标是把资产布局和投放语义彻底对齐。

## Goals / Non-Goals

**Goals:**

- 统一 bundled skill 资产到 `assets/skills/<name>/`
- 统一 bundled command 资产到 `assets/commands/<name>.md`
- 将 skill 投放改为“按目录 bundle 投放”
- 将 command 投放改为“共享源文件 + 宿主差异仅在目标目录”
- 保持现有 skill / command 名称和用户可见行为不变
- 保持 OpenSpec skills 的投放稳定，不因为目录重组而失效

**Non-Goals:**

- 不新增新的 skill 或 command
- 不改变 `opsx-*`、`devos-docs`、`devos-docs-init`、`devos-docs-refresh` 的对外名称
- 不改变宿主目标目录
- 不修改 managed asset manifest 的整体模型，只更新其 source metadata 来源

## Decisions

### 1. 统一资产目录为 `assets/skills` 与 `assets/commands`

新的目标结构为：

```text
assets/
  skills/
    opsx-propose/
      SKILL.md
      ...
    opsx-explore/
      SKILL.md
      ...
    opsx-apply/
      SKILL.md
      ...
    opsx-archive/
      SKILL.md
      ...
    devos-docs/
      SKILL.md
      ...
  commands/
    devos-docs-init.md
    devos-docs-refresh.md
```

原因：

- 资产按类型组织，比按来源组织更稳定
- skill 和 command 的差异是资产类型差异，不是产品来源差异
- 宿主差异应该只留在投影层

备选方案：

- 保留 `openspec-skills` / `devos-skills` 分组
- 不采用。对投影没有价值，只会保留重复的发现逻辑。

### 2. Skill 发现改为扫描整个 bundle 目录

`collectBundledSkillSources()` 不再返回 `sourcePath: .../SKILL.md`，而应改为基于 `assets/skills/*/` 枚举目录，并返回：

- `name`
- `sourceDir`

具体返回结构固定为：

```js
[
  { name: 'opsx-propose', sourceDir: 'assets/skills/opsx-propose' },
  { name: 'devos-docs', sourceDir: 'assets/skills/devos-docs' },
]
```

adapter 内部再统一拼接：

```js
const skillMd = path.join(sourceDir, 'SKILL.md');
```

skill 的真实边界是目录 bundle，而不是 `SKILL.md` 单文件。这样未来 skill 若包含：

- `references/`
- `scripts/`
- `assets/`
- 其他 supporting files

都能作为同一 bundle 被投放。

备选方案：

- 继续只按 `SKILL.md` 工作
- 不采用。会让 skill supporting files 永远处于半支持状态。

### 3. Skill 投放改为同步整个目录，但 marker 仍锚定 `SKILL.md`

宿主投放时：

- 目标 skill 目录仍按 `~/.claude/skills/<name>/`、`~/.codex/skills/<name>/` 这类宿主路径组织
- 投影逻辑同步整个源目录到目标目录
- projection marker 继续写在目标 `SKILL.md`

这样可以兼顾：

- bundle 完整投放
- 现有 marker 识别逻辑
- stale 清理继续按 skill 名清目录

bundle 同步的实现语义固定为：

- 先基于现有托管判断，决定目标 skill 目录是否允许被 Praxis 接管或刷新
- 若目标不是 Praxis-managed（也不是允许接管的 legacy projection），则整包跳过，不进入局部覆盖
- 若目标允许被 Praxis 管理，则按源 bundle 目录递归同步到目标目录
- marker 仍然只写入目标 `SKILL.md`

这里不采用“只覆盖 `SKILL.md`，其他文件 `overwrite:false`”的策略。原因是：

- 对已托管 bundle，supporting files 也属于 Praxis 维护范围
- 若 supporting files 不允许被同步覆盖，托管 bundle 会长期停留在半旧状态
- 真正的保护边界应该是“非托管目录整包跳过”，而不是“托管目录内部只允许部分文件更新”

Node 运行时要求已是 `>=20.19.0`，因此目录同步可以直接基于递归复制能力实现，不需要为旧版本 Node 保留兼容路径。

备选方案：

- 引入目录级 marker 文件
- 不采用。没有必要扩大机制复杂度。

### 4. Command 资产改为单一共享源文件

`devos-docs-init.md` 和 `devos-docs-refresh.md` 只保留一份，放在：

- `assets/commands/devos-docs-init.md`
- `assets/commands/devos-docs-refresh.md`

Claude 和 OpenCode 的差异只保留在：

- 目标投放目录不同

不再保留：

- `src/templates/claude-commands/`
- `src/templates/opencode-commands/`

原因：

- 当前两份内容相同，重复没有价值
- 投放面不同，是 projection 逻辑问题，不是资产源问题

实现命名上，也应把现有 `commandTemplateRoot()` 收敛为更准确的 `commandAssetRoot()` 或等价名称，避免继续把共享 command 资产称为 template root。

### 5. OpenSpec skills 的投放稳定性通过“名字不变 + discovery 统一”保证

OpenSpec 相关 skill 的外部行为保持不变：

- `opsx-propose`
- `opsx-explore`
- `opsx-apply`
- `opsx-archive`

只要 discovery 改成从 `assets/skills/` 扫描目录，并保持名字不变，OpenSpec skill 投放就不会因资产目录改名而出错。

因此本次迁移的兼容核心不是“保留旧路径”，而是：

- 目标 skill name 不变
- target host path 不变
- stale cleanup 仍按 `validNames` 工作

补充约束：

- `codex.js` 继续使用 `~/.codex/skills/`
- `claude.js` 继续使用 `~/.claude/skills/`
- `opencode.js` 继续使用当前共享约定的 `~/.claude/skills/`

这不是本次重构的范围，但在实现和注释里必须明确，避免把“统一资产目录”误解成“统一宿主目标目录”。

### 6. 测试必须覆盖 skill bundle，而不是只覆盖 `SKILL.md`

现有测试主要断言：

- source path 存在
- `SKILL.md` 被投放

本次需要补齐：

- skill bundle 中除 `SKILL.md` 之外的 supporting files 也能被投放
- sync 能补齐缺失的 supporting files
- user-owned 同名非托管 skill 目录不会被误覆盖

同时，command 相关测试应收敛为：

- asset source 只有一份
- Claude/OpenCode 目标目录各自写入成功

## Risks / Trade-offs

- [Risk] 目录重组会打断现有路径断言和 source metadata
  → Mitigation: 限定变更范围在 asset discovery、projection、tests；不改外部名称。

- [Risk] bundle 投放可能误覆盖宿主目录中用户自己加的 supporting files
  → Mitigation: 继续依赖现有托管判断，只对 Praxis-managed 目录做同步。

- [Risk] OpenSpec skills 投放失效
  → Mitigation: 保持 `opsx-*` 名称不变，并增加基于统一 `assets/skills/` 的发现测试。

## Migration Plan

1. 创建 `assets/skills/` 和 `assets/commands/`
2. 将现有 assets / templates 中的 skill 与 command 迁入新目录
3. 修改 projection discovery、skill bundle 投放逻辑与 command asset root
4. 更新 tests 和必要文档
5. 先完成验证，再删除旧目录

旧目录删除的前置条件为：

- 统一 discovery 已从新目录正常读取
- 相关测试已通过
- manifest/source metadata 已按新目录结构记录
- 确认仓库中不再存在对旧目录的运行时引用

回滚方式：

- 若统一 discovery 有问题，可回滚到上一版目录结构
- 因为本次不改变用户级目标路径和命令名，所以回滚不会引入仓库外部兼容问题

## Decision Follow-up

`managed-assets.json` 中应显式记录 `sourceDir`。

本次不要求再额外记录 `sourceSkillMd`，因为它可以由 `path.join(sourceDir, 'SKILL.md')` 确定性推导出来。manifest 只需要记录 bundle 级来源即可，避免重复元数据。
