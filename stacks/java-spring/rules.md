# Java + Spring Boot 编码规范

> 本文档定义了 Java + Spring Boot 项目的通用编码规范和最佳实践。

## 1. 命名规范

### 1.1 包命名 (Package)
- 格式：`com.company.module`
- 全小写，点分隔，反映业务模块化。

### 1.2 类命名 (Class)
- 格式：`PascalCase`
- 强制带有意义的后缀：
    - `Controller`: 处理 HTTP 请求
    - `Service`: 业务逻辑接口或实现
    - `Repository` / `Mapper`: 数据持久层
    - `DTO`: 数据传输对象 (Data Transfer Object)
    - `VO`: 视图对象 (View Object)，用于前端展示
    - `Config`: 配置类

### 1.3 方法命名 (Method)
- 格式：`camelCase`
- 动词前缀：
    - `get` / `find`: 获取数据
    - `create` / `save`: 创建数据
    - `update`: 更新数据
    - `delete`: 删除数据
    - `is` / `has`: 返回布尔值

### 1.4 常量与变量
- 常量：`UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- 变量：`camelCase`。必须有意义，禁止单字母（循环计数器 `i`, `j` 除外）。

---

## 2. 日志规范

### 2.1 日志框架
- 使用 SLF4J 接口，具体实现推荐 Logback。

### 2.2 日志级别
- `ERROR`: 系统异常、依赖服务中断等需要人工介入的情况。
- `WARN`: 业务降级、潜在风险、参数校验不通过。
- `INFO`: 关键业务路径日志（如：订单创建成功、外部调用返回）。
- `DEBUG`: 开发调试信息。

### 2.3 日志格式与占位符
- 统一使用占位符：`log.error("Order process failed | orderId={}, userId={}", orderId, userId, e)`。
- 禁止字符串拼接。
- 敏感数据（手机号、密码、身份证）必须脱敏。

### 2.4 强制禁项
- 禁止 `e.printStackTrace()`。
- 禁止输出巨大对象（如大型 List 或完整序列化后的二进制流）。
- 禁止在 `ERROR` 级别输出普通的业务 `INFO` 内容。

---

## 3. 代码质量规则

| 规则 | 不合规案例 | 修复建议 |
| :--- | :--- | :--- |
| switch 必须有 default | `switch(type) { case 1: ... }` | 增加 `default` 分支处理未知类型 |
| Long 类型字面量用大写 L | `long count = 1l;` | 使用 `1L` 以免混淆数字 1 |
| 禁止静态 SimpleDateFormat | `static final SimpleDateFormat sdf` | 使用 `java.time.format.DateTimeFormatter` |
| 异常处理使用 logger | `catch (Exception e) { e.printStackTrace(); }` | `log.error("Error message", e);` |
| BigDecimal 初始化 | `new BigDecimal(0.1)` | 使用 `BigDecimal.valueOf(0.1)` 或 `new BigDecimal("0.1")` |
| 嵌套循环限制 | 三层及以上嵌套循环 | 通过业务逻辑优化或数据预读平铺为一层/两层 |
| 清理无用代码 | 未使用的私有方法、变量、导入 | 及时删除，保持代码整洁 |
| 包装类比较 | `Integer a = 128; if (a == 128)` | 使用 `equals()` 方法进行数值比较 |
| 定时任务实现 | `new Timer().schedule(...)` | 使用 `ScheduledExecutorService` |
| 强制使用花括号 | `if (condition) return;` | `if (condition) { return; }` |

---

## 4. Spring Boot 惯例

### 4.1 依赖注入
- **强制使用构造器注入**。不推荐在字段上使用 `@Autowired`，以便于编写单元测试。
- 建议对构造器中的依赖使用 `final` 修饰。

### 4.2 配置管理
- 推荐使用 `@ConfigurationProperties` 将配置映射为结构化对象，而非分散的 `@Value`。
- 严格区分环境 Profile：`dev` (开发), `test` (测试), `prod` (生产)。

### 4.3 异常与验证
- 使用 `@RestControllerAdvice` 集中处理全局异常。
- 利用 Spring Validation (`@Valid`, `@NotNull`, `@NotBlank`) 进行入参校验。

### 4.4 事务管理 (@Transactional)
- 仅标记在 `public` 方法上。
- 避免同一个类内的自调用，这会导致事务增强失效。
- 保持事务方法短小，避免在事务中包含耗时的网络 IO。

---

## 5. 核心禁止项（红线）

```text
❌ 禁止拼接 SQL（使用参数化查询/MyBatis 占位符）
❌ 禁止硬编码密钥、密码、URL 等敏感配置
❌ 禁止使用 BigDecimal(double) 构造器（存在精度丢失）
❌ 禁止三层以上嵌套循环（性能黑洞）
❌ 禁止 e.printStackTrace()（日志不可控）
❌ 禁止使用静态 SimpleDateFormat（线程不安全）
❌ 禁止在方法内频繁 new ObjectMapper()（应注入单例或定义常量）
❌ 禁止空 catch 块（吞掉异常是线上事故的根源）
```
