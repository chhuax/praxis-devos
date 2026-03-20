# YonBIP Java + Spring Boot 技术栈声明

> 本文件是 `yonbip-java` 技术栈的元信息声明，供安装脚本和 AI 代理读取。

## 基本信息

| 字段 | 值 |
|------|-----|
| 名称 | yonbip-java |
| 显示名 | YonBIP Java + Spring Boot |
| 运行时 | JDK 21+ |
| 框架 | Spring Boot 2.x |
| 构建工具 | Maven |
| 包管理 | Maven Central / YonBIP 私有仓库 |

## 持久层（按项目选择）

| 方案 | 适用场景 |
|------|---------|
| 项目自有 JDBC 封装 | 内部框架（如 YmsJdbc） |

## 工具链命令

安装脚本和 git-workflow 等通用 skill 通过以下字段获取技术栈特定命令：

```yaml
commands:
  build: "mvn clean compile"
  test: "mvn test"
  verify: "mvn clean verify"
  lint: "mvn checkstyle:check"        # 如项目配置了 checkstyle
  package: "mvn clean package"
  format: "mvn spotless:apply"         # 如项目配置了 spotless
  deps: "mvn dependency:tree"
```

## 包含的 Skills

所有 skills 统一存放在项目根目录 `.claude/skills/` 下（OpenCode 和 Claude Code 共用）。

| Skill | 路径 | 说明 |
|-------|------|------|
| database-guidelines | `.claude/skills/database-guidelines/SKILL.md` | 数据库设计、SQL 编写、索引规范 |
| error-handling | `.claude/skills/error-handling/SKILL.md` | 异常处理规范、异常码体系、统一响应格式 |
| security | `.claude/skills/security/SKILL.md` | 安全编码规范（注入防护、密码安全、XSS/CSRF） |
| redis-guidelines | `.claude/skills/redis-guidelines/SKILL.md` | Redis 使用规范（命令、Key 设计、过期策略） |

## 包含的 Rules

| 文件 | 说明 |
|------|------|
| `rules.md` | YonBIP Java 编码规范（命名、日志、代码检查、分支管理） |

## 关联文件

- `project-example.md` — 基于 YMS 项目的 project.md 填写示例
