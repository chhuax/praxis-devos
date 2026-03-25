# Praxis Session Checklist

用于复盘一次 agent 会话是否准确触发 Praxis DevOS 框架，而不是只“看起来像”走了流程。

## 1. Proposal Entry

- [ ] 用户输入属于 `/change`、`/proposal`，或明显是新功能 / API 变更 / 架构变更
- [ ] agent 明确进入 proposal flow，而不是直接开始实现
- [ ] 若需求仍不明确，先进入 `brainstorming`
- [ ] agent 读取 `openspec/AGENTS.md`
- [ ] agent 显式加载 `openspec` skill，而不是只停留在最小规则文本

## 2. Proposal Preparation

- [ ] 执行或等价完成 `praxis-devos openspec list --specs`
- [ ] 执行或等价完成 `praxis-devos openspec list`
- [ ] 阅读 `openspec/project.md`
- [ ] 明确判断是“新 capability”还是“修改现有 capability”
- [ ] 选择合法的 `change-id`（kebab-case，动词前缀）

## 3. Proposal Output

- [ ] 生成 `proposal.md`
- [ ] 生成 `spec delta`
- [ ] 完整提案场景下生成 `tasks.md`
- [ ] 每个 Requirement 至少有一个 `#### Scenario:`
- [ ] proposal 内容和实现范围一致，不是空泛描述

## 4. Proposal Validation

- [ ] 执行 `praxis-devos openspec validate <change-id> --strict --no-interactive`
- [ ] validate 通过后，再进入“等待批准”或“请求继续”
- [ ] proposal 阶段没有因为 `/change` 自动创建 Git 分支

## 5. Implementation Entry

- [ ] 用户或流程明确给出“继续实现 / 已批准”信号
- [ ] agent 明确切换到 implementation flow
- [ ] 先读取 `.praxis/rules.md`
- [ ] 如果来自 proposal，实现前显式检查 Git 分支状态
- [ ] 技术栈 skill 只在需要时按需加载，而不是一股脑全量加载

## 6. Framework Skill Gate

- [ ] proposal / spec / archive 场景能看到 `openspec` skill 的明确证据
- [ ] 需求不明确时能看到 `brainstorming` 的明确证据
- [ ] 已批准 proposal 进入实现且当前分支不可直接复用时，能看到 `git-workflow` 的明确证据
- [ ] 完成前能看到 `verification-before-completion` 的明确证据
- [ ] 会话不是只触发 OpenSpec，而是触发了框架层的管控 skill

## 7. Branch Gate

- [ ] 开始编码前，agent 检查当前 Git 分支状态
- [ ] 如果已在与该 change 对应的专用实现分支，agent 明确说明将复用该分支
- [ ] 如果当前在 `main` / `develop` / `release/*` / 无关分支，agent 先走 `git-workflow` 再创建或切换实现分支
- [ ] agent 没有无理由强制重切一个重复分支

## 8. Completion Gate

- [ ] 完成前执行验证，不是只“代码写完”
- [ ] 对 proposal change 执行 `praxis-devos openspec validate <change-id> --strict --no-interactive`
- [ ] 核对 `tasks.md` 是否全部 `[x]`
- [ ] 对照每个 `Scenario` 检查实现与测试

## 判定建议

- 命中 8/8：准确触发框架
- 命中 6-7 项：主路径正确，但存在门禁缺口
- 命中 4-5 项：只触发了部分框架语义
- 命中 ≤3 项：基本没有进入 Praxis 流程
