---
name: yonbip-database
description: |
  YonBIP 数据库设计规范扩展。在通用 database-guidelines skill 基础上，提供 YonBIP 产品特有的：
  1. 多租户字段规范（ytenant_id）
  2. YonBIP 表名/字段命名规范
  3. 多数据库适配（MySQL/Oracle/PostgreSQL）
  4. YMS 框架集成
  
  本 skill 扩展通用 database-guidelines，不可独立使用。
triggers:
  - ytenant_id
  - YonBIP 数据库
  - YMS
  - iuap
  - 多租户表设计
---

# YonBIP 数据库设计规范（栈专属扩展）

> 本 skill 是 `database-guidelines`（通用）的 **YonBIP 栈扩展**。通用 SQL 规范、索引原则等请参考通用 skill。

## 1. 多租户强制规则

### 1.1 ytenant_id 字段

**所有业务表必须带 `ytenant_id` 字段：**
- 类型：varchar(36)
- 属性：NOT NULL
- 建议不设置默认值
- 必须带索引：`i_ytenant_id` 或以 `ytenant_id` 开头的联合索引

---

## 2. YonBIP 命名规范

### 2.1 Schema（数据库）

| 类型 | 格式 | 示例 | 约束 |
|------|------|------|------|
| 平台库 | `iuap_产品_库名` | `iuap_aip_rapdb` | 总长度≤30字符 |
| 领域库 | `yonbip_领域_库名` | `yonbip_scm_pubdb` | 总长度≤30字符 |

### 2.2 表名

| 类型 | 格式 | 示例 | 约束 |
|------|------|------|------|
| 固定表 | `前缀_业务表英文含义` | `org_factory_define` | 长度≤48字符 |
| 主表（头） | `前缀_业务含义_h` | `order_h` | h=head |
| 子表（体） | `前缀_业务含义_b` | `order_b` | b=body |
| 孙表 | `前缀_业务含义_g` | `order_g` | g=grand |
| 扩展表 | `前缀_业务含义_ext` | `org_ext` | ext=extension |
| 客开扩展 | `前缀_业务含义_isvext` | `org_isvext` | ISV扩展 |
| 报表表 | `前缀_s_业务含义` | `xxx_s_report` | s=summary |
| 临时表 | `tmp_{YYYYMMDD}_表名` | `tmp_20240301_xxx` | |
| 备份表 | `bak_{YYYYMMDD}_表名` | `bak_20240301_xxx` | |
| 待删除表 | `del_{YYYYMMDD}_表名` | `del_20240301_xxx` | 半年后自动清理 |

### 2.3 字段命名

| 类型 | 前缀/后缀 | Java类型 | 数据库类型 | 取值示例 |
|------|----------|----------|-----------|---------|
| Boolean | `b_` | Boolean | smallint | 0=false, 1=true |
| 枚举 | `e_` | String | varchar(36) | 元数据引用 |
| 参照主键 | `id` 结尾 | Long/String | bigint/varchar(36) | orgId |
| 顺序 | `i_` | Integer | int | iOrder |
| 金额 | `amount` 结尾 | BigDecimal | decimal(20,8) | natAmount |
| 数量 | `qty` 结尾 | BigDecimal | decimal(20,8) | orderQty |
| 时间 | `ts_` | Date | timestamp/datetime | tsCreateTime |
| 日期 | `dt_` | Date | date | dtBirthday |
| 创建人 | `creator` | String | varchar(36) | |
| 创建时间 | `createTime` | Date | timestamp | |
| 修改人 | `modifier` | String | varchar(36) | |
| 修改时间 | `modifyTime` | Date | timestamp | |

---

## 3. 数据类型规范

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

## 4. 多数据库适配

### 4.1 必须适配的内容

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

### 4.2 推荐使用框架

使用 MyBatis Plus 或 YMS 提供的多数据库适配工具，避免直接写原生SQL。

---

## 5. YMS 框架集成

```java
// 使用框架提供的分页工具
PageHelper.startPage(pageNum, pageSize);
var users = userMapper.selectUsers();
```

---

## 相关文件

- `database-guidelines` — 通用数据库设计规范（索引、SQL 优化、注入防护等）
- `stacks/yonbip-java/rules.md` — YonBIP 编码规范总览
