## 1. 资产目录重组

- [x] 1.1 创建统一资产目录：
  - `assets/skills/`
  - `assets/commands/`
- [x] 1.2 将现有 `opsx-*` skills 迁移到 `assets/skills/<skill-name>/`
- [x] 1.3 将 `devos-docs` skill 迁移到 `assets/skills/devos-docs/`
- [x] 1.4 将共享 docs command 资产迁移到：
  - `assets/commands/devos-docs-init.md`
  - `assets/commands/devos-docs-refresh.md`
- [x] 1.5 在验证通过后删除旧资产目录：
  - [x] 1.5.1 确认统一 discovery 已从新目录正常读取
  - [x] 1.5.2 确认 manifest/source metadata 已按新目录结构记录
  - [x] 1.5.3 删除 `assets/openspec-skills/`
  - [x] 1.5.4 删除 `assets/devos-skills/`
  - [x] 1.5.5 删除 `src/templates/claude-commands/`
  - [x] 1.5.6 删除 `src/templates/opencode-commands/`

## 2. Skill / command 发现与投放逻辑

- [x] 2.1 重构 bundled skill discovery，统一从 `assets/skills/*/` 枚举 skill bundle
- [x] 2.2 将 discovery 返回值从 `sourcePath` 收敛为以 bundle 目录为核心的 `sourceDir`
- [x] 2.3 在 adapter 内统一由 `sourceDir` 推导 `SKILL.md` 路径
- [x] 2.4 更新 skill 投放逻辑，使其同步整个 skill bundle，而不是只写 `SKILL.md`
- [x] 2.5 保持 projection marker 继续锚定目标 `SKILL.md`
- [x] 2.6 更新 stale cleanup，使其继续按 skill name 清理目标 skill 目录
- [x] 2.7 更新 Claude / OpenCode command 投放逻辑，统一从 `assets/commands/` 读取共享模板
- [x] 2.8 将 command 相关变量/辅助函数命名收敛为 asset 语义，而不是 template 语义
- [x] 2.9 保持宿主差异只体现在 command 目标目录，而不是源资产目录

## 3. 托管清单与兼容性

- [x] 3.1 确保 managed asset manifest 继续记录 skill / command 的投放结果
- [x] 3.2 调整 manifest 中与 source metadata 相关的记录，使其兼容新的 bundle `sourceDir`
- [x] 3.3 确保 user-owned 同名非托管 skill 目录不会被 bundle 投放误覆盖
- [x] 3.4 确保现有 `opsx-*` 和 `devos-docs` 的外部名称与目标宿主路径保持不变
- [x] 3.5 确保 `devos-docs-init`、`devos-docs-refresh` 的对外 command 名称保持不变
- [x] 3.6 在代码注释或说明中明确 OpenCode 当前与 Claude 共享 `~/.claude/skills/` 的约定

## 4. 文档与说明

- [x] 4.1 更新与资产源路径相关的设计/说明文档，使其不再引用旧的 skill / command 源目录
- [x] 4.2 更新必要说明，明确 skill 是 bundle 目录而不是单个 `SKILL.md`
- [x] 4.3 更新必要说明，明确 command 是共享资产，宿主差异仅在投放目标目录

## 5. 测试

- [x] 5.1 更新现有测试中的旧资产路径断言，统一到 `assets/skills/` 与 `assets/commands/`
- [x] 5.2 增加 skill bundle 投放测试，验证 supporting files 会随 skill 一起投放
- [x] 5.3 增加 sync 回归测试，验证缺失的 skill supporting files 会被恢复
- [x] 5.4 增加保护测试，验证 user-owned 同名非托管 skill 目录不会被误覆盖
- [x] 5.5 验证 `opsx-*` skills 在统一 discovery 下仍能被正确发现与投放
- [x] 5.6 验证 `devos-docs` skill 在统一 discovery 下仍能被正确发现与投放
- [x] 5.7 验证 Claude / OpenCode command 都从单一共享 command 源文件投放成功

## 6. 验证

- [x] 6.1 运行 `node --test test/praxis-devos.test.js`
- [x] 6.2 运行 `node --test`
