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

## 包含的 Skills（栈专属）

以下 skills 存放在 `stacks/yonbip-java/skills/` 下，安装时复制到 `.claude/skills/`。
它们**扩展**框架通用 skills，提供 YonBIP 产品特有的规范。

| Skill | 源路径 | 说明 | 扩展 |
|-------|------|------|------|
| yonbip-database | `stacks/yonbip-java/skills/yonbip-database/` | 多租户字段、YonBIP 命名规范、多数据库适配 | database-guidelines |
| yonbip-error-handling | `stacks/yonbip-java/skills/yonbip-error-handling/` | 异常码体系、BusinessException、异常等级 | error-handling |
| yonbip-security | `stacks/yonbip-java/skills/yonbip-security/` | CheckMarx/YCG 扫描、密码策略、会话超时 | security |
| yonbip-redis | `stacks/yonbip-java/skills/yonbip-redis/` | 多租户 Key 设计、YMSRedisTemplate、Region 命名 | redis-guidelines |

## 包含的 Rules

| 文件 | 说明 |
|------|------|
| `rules.md` | YonBIP Java 编码规范（命名、日志、代码检查、分支管理） |

## 关联文件

- `project-example.md` — 基于 YMS 项目的 project.md 填写示例
