# Java + Spring Boot 技术栈基线

> 通用 Java + Spring Boot 参考基线，适用于标准 Java Web 项目。安装到项目后，建议结合团队规范继续调整 `.praxis/rules.md` 和 `.praxis/skills/`。

## 基本信息

| 字段 | 值 |
|------|-----|
| 名称 | java-spring |
| 显示名 | Java + Spring Boot |
| 运行时 | JDK 21+ |
| 框架 | Spring Boot 3.x |
| 构建工具 | Maven / Gradle |

## 工具链命令

```yaml
commands:
  build: "mvn clean compile"          # Gradle: ./gradlew compileJava
  test: "mvn test"                    # Gradle: ./gradlew test
  verify: "mvn clean verify"          # Gradle: ./gradlew check
  lint: "mvn checkstyle:check"        # 需项目配置 checkstyle 插件
  format: "mvn spotless:apply"        # 需项目配置 spotless 插件
  deps: "mvn dependency:tree"         # Gradle: ./gradlew dependencies
```

## 包含的 Skills（栈专属领域能力）

| Skill | 路径 | 说明 |
|-------|------|------|
| java-database | `skills/java-database/` | 数据库设计、JPA/MyBatis 模式、SQL 安全 |
| java-error-handling | `skills/java-error-handling/` | Spring 异常处理、RFC 7807、结构化错误响应 |
| java-security | `skills/java-security/` | Spring Security、OWASP for Java、依赖扫描 |
| java-testing | `skills/java-testing/` | JUnit 5、Mockito、Spring Boot Test |

这些 skills 会在安装时复制到项目的 `.praxis/skills/`，后续可以按公司或项目规范修改。

## 包含的 Rules

| 文件 | 说明 |
|------|------|
| `rules.md` | Java + Spring Boot 初始编码基线 |
