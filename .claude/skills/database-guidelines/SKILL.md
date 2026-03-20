---
name: database-guidelines
description: |
  YonBIP 数据库设计规范与 SQL 编写指南。使用此 skill 当需要：
  1. 设计数据库表结构
  2. 编写 SQL 查询语句
  3. 创建索引
  4. 处理分页
  5. 多数据库适配
  
  涵盖：表设计规范、SQL 编写规范、索引设计、分页规范、多数据库适配
triggers:
  - 数据库设计
  - 表结构
  - SQL 编写
  - 索引优化
  - 分页查询
  - 建表
  - 字段命名
  - ytenant_id
---

# YonBIP 数据库设计规范

本 skill 提供 YonBIP 产品的数据库设计规范和 SQL 编写指导。

## 快速索引

| 类别 | 说明 |
|------|------|
| [强制规则](#1-强制规则) | 所有表必须遵守的基础规范 |
| [SQL编写规范](#2-sql-编写规范) | 查询、插入、更新规范 |
| [索引设计](#3-索引设计规范) | 索引创建原则与命名 |
| [分页规范](#4-分页规范) | 分页查询标准方式 |
| [多数据库适配](#5-多数据库适配) | MySQL/Oracle/PostgreSQL 适配 |

---

## 1. 强制规则

### 1.1 基础规范

1. **所有业务表必须带 `ytenant_id` 字段**
   - 类型：varchar(36)
   - 属性：NOT NULL
   - 建议不设置默认值
   - 必须带索引：`i_ytenant_id` 或以 `ytenant_id` 开头的索引

2. **表名长度≤48字符**（为特征表扩展预留）

3. **禁止使用数据库关键字和保留字**

4. **对象名必须使用小写字母、数字、下划线**

5. **临时表必须 `tmp_` 前缀**，格式：`tmp_{YYYYMMDD}_表名`

6. **备份表必须 `bak_` 前缀**，格式：`bak_{YYYYMMDD}_表名`

7. **待删除表必须 `del_` 前缀**，格式：`del_{YYYYMMDD}_表名`，DBA半年后自动清理

### 1.2 数据类型规范

| Java类型 | 数据库类型 | 说明 |
|----------|-----------|------|
| Boolean | smallint | 0=false, 1=true |
| Integer | int | |
| Long | bigint | |
| String | varchar(36) | 参照主键 |
| String | varchar(255) | 普通字符串 |
| String | text/clob | 大文本 |
| BigDecimal | decimal(20,8) | 金额 |
| Date/Timestamp | timestamp/datetime | 时间 |
| Date | date | 日期 |

---

## 2. SQL 编写规范

### 2.1 性能优化规则

1. **避免全表扫描**
   - WHERE 条件必须有索引
   - 避免在索引字段上使用函数或表达式

2. **避免隐式转换**
   - 字段类型与比较值类型必须一致

3. **禁止三层以上嵌套循环**

4. **使用预编译（绑定变量）**
    ```java
    // ❌ 错误
    String sql = "SELECT * FROM user WHERE name = '" + name + "'";

    // ✅ 正确
    var sql = """
            SELECT id, name
            FROM user
            WHERE name = ?
            """;
    var ps = conn.prepareStatement(sql);
    ps.setString(1, name);
    ```

5. **避免笛卡尔积**

6. **避免 SELECT ***
   - 只查询需要的字段

7. **IN 列表不超过1000个**

8. **逻辑删除字段应建立联合索引**

### 2.2 禁止的SQL模式

```sql
-- ❌ 禁止动态拼接SQL
SELECT * FROM table WHERE name = '${param}'

-- ❌ 禁止使用OR连接多个条件（用UNION ALL替代）
WHERE a = 1 OR a = 2 OR a = 3

-- ❌ 禁止LIKE左模糊
WHERE name LIKE '%abc'  -- 无法使用索引

-- ✅ 正确的模糊查询
WHERE name LIKE 'abc%'  -- 可以使用索引

-- ❌ 禁止在WHERE中对字段进行函数操作
WHERE DATE(create_time) = '2024-01-01'

-- ✅ 正确写法
WHERE create_time >= '2024-01-01' AND create_time < '2024-01-02'
```

---

## 3. 索引设计规范

### 3.1 创建索引原则

1. **区分度高的字段优先建索引**

2. **联合索引遵循最左前缀原则**

3. **联合索引字段数≤5，最多7个**

4. **单表索引数≤5个**

5. **禁止重复索引**

### 3.2 索引命名规范

```
格式：i_表名_字段名_字段名
示例：i_user_ytenant_id_org_id
```

---

## 4. 分页规范

使用多数据库适配的分页方式：

```java
// 使用框架提供的分页工具
PageHelper.startPage(pageNum, pageSize);
var users = userMapper.selectUsers();
```

---

## 5. 多数据库适配

### 5.1 必须适配的内容

1. **数据类型**
   - Oracle：NUMBER, VARCHAR2, CLOB
   - MySQL：INT, VARCHAR, TEXT
   - PostgreSQL：INTEGER, VARCHAR, TEXT

2. **分页语法**
   - MySQL：LIMIT offset, size
   - Oracle：ROWNUM
   - SQL Server：OFFSET FETCH

3. **日期函数**
   - MySQL：NOW()
   - Oracle：SYSDATE
   - PostgreSQL：CURRENT_TIMESTAMP

4. **序列**
   - MySQL：AUTO_INCREMENT
   - Oracle：SEQUENCE
   - PostgreSQL：SERIAL

### 5.2 推荐使用框架

使用 MyBatis Plus 或 YMS 提供的多数据库适配工具，避免直接写原生SQL。
