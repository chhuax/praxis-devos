# 技术栈指南

## 概述

技术栈是一组预制的规则与领域 Skills。安装时，Praxis DevOS 会把它们写入项目的 canonical 目录 `.praxis/`：

- `stack.md` → `.praxis/stack.md`
- `rules.md` → `.praxis/rules.md`
- `skills/` → `.praxis/skills/`

`.opencode/` 不再是事实来源，只是 OpenCode 的兼容投影。

## 可用技术栈

| 栈名 | 说明 |
|------|------|
| starter | 最小模板，用于创建新栈的起点 |
| java-spring | Java + Spring Boot 通用参考栈，包含企业级开发规范 |

## 目录结构

```text
stacks/{栈名}/
├── stack.md               # 技术栈元信息（必须）
├── rules.md               # 技术栈规则（建议）
└── skills/                # 栈专属 Skills（可选）
    └── {skill-name}/
        └── SKILL.md
```

## 创建新技术栈

1. `cp -r stacks/starter stacks/my-stack`
2. 编辑 `stack.md`，填写运行时、构建工具、命令约定
3. 编辑 `rules.md`，定义该栈的编码约束
4. 在 `skills/` 下添加领域 skill
5. 运行 `praxis-devos init --stack my-stack` 或 `praxis-devos sync`

## 私有技术栈

1. 在 `stacks/` 下创建私有栈目录
2. 在 `.gitignore` 中排除
3. 通过 `praxis-devos init --stack your-private-stack` 安装

## 参考

- `stacks/starter/`：最小化模板
- `stacks/java-spring/`：完整参考实现
