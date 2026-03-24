# 技术栈指南

## 概述

技术栈是一组预制的规则与领域 Skills，但它们的定位是**初始基线**，不是项目落地后的最终标准。安装时，Praxis DevOS 会把它们写入项目的 canonical 目录 `.praxis/`：

- `stack.md` → `.praxis/stack.md`
- `rules.md` → `.praxis/rules.md`
- `skills/` → `.praxis/skills/`

安装完成后：

- `stacks/` 中的内容仍然是框架仓库内的种子资产
- `.praxis/` 才是项目事实来源
- 公司或项目团队可以直接按自己的规范修改 `.praxis/rules.md` 和 `.praxis/skills/`

`.opencode/` 不再是事实来源，只是 OpenCode 的兼容投影。

## 可用技术栈

| 栈名 | 说明 |
|------|------|
| starter | 最小模板，用于创建新栈的起点 |
| java-spring | Java + Spring Boot 参考基线，提供一套可继续定制的默认规则与领域 skills |

## 目录结构

```text
stacks/{栈名}/
├── stack.md               # 技术栈元信息（必须）
├── rules.md               # 技术栈初始规则（建议）
└── skills/                # 栈专属领域 Skills（可选）
    └── {skill-name}/
        └── SKILL.md
```

这里的 `skills/` 指的是数据库、安全、测试、异常处理等**领域能力**，不是按 agent 厂商拆分的专属 skill。

## 创建新技术栈

1. `cp -r stacks/starter stacks/my-stack`
2. 编辑 `stack.md`，填写运行时、构建工具、命令约定
3. 编辑 `rules.md`，定义该栈的初始编码基线
4. 在 `skills/` 下添加领域 skill
5. 运行 `praxis-devos init --stack my-stack` 或 `praxis-devos sync`

建议把栈内容理解为“默认值”，而不是“不可修改的标准答案”。

## 私有技术栈

1. 在 `stacks/` 下创建私有栈目录
2. 在 `.gitignore` 中排除
3. 通过 `praxis-devos init --stack your-private-stack` 安装

## 参考

- `stacks/starter/`：最小化模板
- `stacks/java-spring/`：参考基线示例
