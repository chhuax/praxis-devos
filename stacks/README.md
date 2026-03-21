# 技术栈指南

## 概述
技术栈在 praxis-devos 框架中定义了特定编程语言、框架和工程环境的开发基准。它将编码规范、构建指令和领域专属能力封装成可复用的单元，确保 AI 代理在不同技术背景下都能输出高质量代码。

## 可用技术栈

| 栈名 | 说明 |
|------|------|
| starter | 最小模板，用于创建新栈的起点 |
| java-spring | Java + Spring Boot 通用参考栈，包含企业级开发规范 |

## 创建新技术栈

### 目录结构
每个技术栈都存放于 `stacks/` 目录下的独立子目录中：

```text
stacks/{栈名}/
├── stack.md               # 技术栈元信息，定义运行时和工具链（必须）
├── rules.md               # 编码规范，定义命名、风格和禁止项（必须）
├── skills/                # 栈专属 Skills，增强 AI 的领域能力（可选）
│   └── {skill-name}/
│       └── SKILL.md
└── project-example.md     # project.md 填写示例，帮助用户快速配置（可选）
```

### 步骤

1. **复制模板**：以 starter 为基础创建新目录。
   `cp -r stacks/starter stacks/my-stack`
2. **编辑 stack.md**：填入环境版本、构建工具以及核心指令（如 build, test）。
3. **编辑 rules.md**：编写详细的编码规范，包括项目结构、命名风格、日志打印等。
4. **添加 Skills**：在 `skills/` 目录下创建特定领域的 AI 指令。
5. **安装到项目**：使用 install 脚本将配置同步到目标工程。
   `./install.sh --stack my-stack --dir /path/to/your-project`
6. **激活技术栈**：在项目的 `openspec/project.md` 顶部设置 `praxis-devos:stack` 标记。

### stack.md 必填字段
请参考 `java-spring/stack.md` 的格式进行填写：
- **基本信息**：运行时名称、版本要求、默认构建工具。
- **工具链命令**：AI 执行构建、测试、代码扫描时调用的具体命令。
- **包含的 Skills**：列出该技术栈特有的能力模块名称。

### rules.md 建议内容
- **命名规范**：包名、类名、方法名以及常量定义的具体要求。
- **异常处理**：全局异常拦截、错误码定义规则。
- **日志规范**：日志分级、追踪 ID (TraceID) 的注入方式。
- **禁止项**：明确禁止使用的库或编码反模式。

## 私有技术栈

企业内部的技术栈可以保持私有，无需提交到公共开源仓库。这种机制允许团队维护专有的架构模板和内部工具链。

### 设置步骤

1. 在 `stacks/` 下创建私有栈目录，例如 `stacks/my-enterprise/`。
2. 在项目根目录的 `.gitignore` 中添加：`stacks/my-enterprise/`。
3. 按照标准流程进行配置和使用 `install.sh` 安装。
4. 私有栈的 skills 会与通用 skills 一起部署到项目的 `.claude/skills/` 目录。

### 扩展公共栈

私有栈可以基于公共栈进行扩展。例如，创建一个基于 `java-spring` 的企业内部栈：
- 在私有栈的 skill 描述中使用「扩展 java-xxx」来声明继承关系。
- 安装脚本会同时部署基础栈和扩展栈的全部能力，AI 代理将自动合并这些规则。

## Skill 生效机制

`install.sh` 脚本负责将分布在不同目录的 skills 统一部署到项目的 `.claude/skills/`：
1. **通用模块**：`skills/` 目录下的内容始终会被安装。
2. **栈专属模块**：仅当安装命令指定了特定技术栈时，`stacks/{栈}/skills/` 才会同步。

AI 代理（如 OpenCode 或 Claude Code）在启动时会深度扫描 `.claude/skills/` 目录并自动加载所有合法的模块。

## 参考资源

- `stacks/starter/`：用于快速上手的最小化模板。
- `stacks/java-spring/`：功能完善的参考实现，展示了复杂的规则定义。
- `AGENTS.md`：查看 §0.2 章节，深入了解技术栈的自动识别与动态加载逻辑。
