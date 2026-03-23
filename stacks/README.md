# 技术栈指南

## 概述

技术栈是一组**预制的领域 Skills**，安装时复制到用户项目的 `.opencode/skills/`。用户项目里不会出现 `stacks/` 目录——这个目录只存在于框架仓库中，用于组织预制模板。

技术栈是**可选的**。不选时框架核心功能完全不受影响。

## 可用技术栈

| 栈名 | 说明 |
|------|------|
| starter | 最小模板，用于创建新栈的起点 |
| java-spring | Java + Spring Boot 通用参考栈，包含企业级开发规范 |

## 创建新技术栈

### 目录结构

```text
stacks/{栈名}/
├── stack.md               # 技术栈元信息（必须）
└── skills/                # 栈专属 Skills（安装时复制到 .opencode/skills/）
    └── {skill-name}/
        └── SKILL.md
```

### 步骤

1. `cp -r stacks/starter stacks/my-stack`
2. 编辑 `stack.md`，填入运行时版本、构建工具等元信息。
3. 在 `skills/` 下创建领域 skill。
4. `praxis-init` 时指定 `--stack my-stack`。

## 私有技术栈

1. 在 `stacks/` 下创建私有栈目录。
2. 在 `.gitignore` 中排除。
3. 通过 `praxis-init` 安装。

## 参考

- `stacks/starter/`：最小化模板。
- `stacks/java-spring/`：完整参考实现。
