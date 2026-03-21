---
name: java-database
description: Java 数据库设计与持久化规范。涵盖表设计、SQL 安全、索引优化、JPA/MyBatis 模式、分页、迁移。
triggers:
  - 数据库设计
  - 表结构变更
  - SQL 优化
  - 持久层实现
  - JPA
  - MyBatis
---

# Java 数据库设计与持久化规范

本规范定义了 Java + Spring Boot 环境下的数据库设计、开发与维护标准。

## 1. 表设计规范

数据库表是系统的根基，必须遵循统一的命名与结构规范。

### 1.1 基础命名
- **表名与字段名**：使用小写字母，单词间用下划线 `_` 分隔（snake_case）。
- **禁止复数**：表名应使用单数形式，例如使用 `user` 而不是 `users`。
- **主键命名**：统一使用 `id`。

### 1.2 数据类型选择
- **主键**：必须使用 `bigint` (Java `Long`)，建议使用雪花算法或数据库自增。
- **金额与比例**：严禁使用 `float` 或 `double`。必须使用 `decimal` (Java `BigDecimal`)。
- **状态与类型**：使用 `tinyint` 或 `varchar`，避免使用 `enum` 类型以便于扩展。

### 1.3 审计字段
每张业务表必须包含以下四个基础审计字段：
```sql
CREATE TABLE example_table (
    id BIGINT PRIMARY KEY,
    -- ... 业务字段 ...
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(64) NOT NULL,
    updated_by VARCHAR(64) NOT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0
);
```

## 2. SQL 安全

防止 SQL 注入是持久层的首要任务。

### 2.1 参数化查询
严禁使用字符串拼接构建 SQL 语句。必须使用占位符：
- **JDBC**: 使用 `PreparedStatement`。
- **JPA**: 使用 `@Query` 中的命名参数 `:paramName`。
- **MyBatis**: 统一使用 `#{}` 语法。

```java
// JPA 示例
@Query("SELECT u FROM User u WHERE u.email = :email")
Optional<User> findByEmail(@Param("email") String email);

// MyBatis 示例
// <select id="findById" resultType="User">
//   SELECT * FROM user WHERE id = #{id}
// </select>
```

## 3. 索引设计

索引是性能优化的核心。

- **高选择性优先**：优先在区分度高的列（如 `email`, `mobile`）建立索引。
- **最左前缀原则**：建立联合索引 `(a, b, c)` 时，查询必须从 `a` 开始匹配。
- **覆盖索引**：尽量让查询字段落在索引中，减少回表操作。
- **数量限制**：单表索引数量建议控制在 5 个以内。

## 4. 分页模式

### 4.1 传统 Offset 分页
适用于数据量较小的场景（万级以下）。
```java
public Page<User> getUsers(Pageable pageable) {
    return userRepository.findAll(pageable);
}
```

### 4.2 Cursor 分页
大数据量（百万级以上）应使用游标分页，通过 ID 范围查询避免深分页性能问题。
```sql
-- 推荐做法
SELECT * FROM orders WHERE id < :lastId ORDER BY id DESC LIMIT 20;
```

## 5. ORM 最佳实践

### 5.1 JPA 实体设计
- 实体类应使用 `@Entity`。
- 必须实现 `Serializable`。
- 关联关系（`@OneToMany`, `@ManyToMany`）默认必须设置为 `FetchType.LAZY`。

### 5.2 事务管理
- 事务标注在 Service 层，尽量缩小事务范围。
- 必须明确处理 `RuntimeException` 引起的回滚。
```java
@Transactional(rollbackFor = Exception.class)
public void processOrder(OrderDTO dto) {
    // 业务逻辑
}
```

## 6. 数据库迁移规范

- **版本控制**：使用 Flyway 或 Liquibase 管理 DDL 变更。
- **向后兼容**：新增列必须允许为 `NULL` 或提供默认值，确保灰度发布时旧版代码不崩溃。
- **禁止修改旧脚本**：已执行的迁移脚本严禁修改，必须通过新增脚本进行修正。
