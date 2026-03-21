---
name: yonbip-error-handling
description: |
  YonBIP 异常处理规范扩展。在通用 error-handling skill 基础上，提供 YonBIP 产品特有的：
  1. 标准异常组件（yms-core-api）
  2. 异常码格式（产品编码-二级分类-6位序号）
  3. 异常等级体系（level 0-99）
  4. 公共异常码清单
  
  本 skill 扩展通用 error-handling，不可独立使用。
triggers:
  - BusinessException
  - displayCode
  - YonBIP 异常码
  - yms-core-api
  - 产品编码
---

# YonBIP 异常处理规范（栈专属扩展）

> 本 skill 是 `error-handling`（通用）的 **YonBIP 栈扩展**。通用异常处理原则请参考通用 skill。

## 1. 标准异常组件

### Maven 依赖

```xml
<dependency>
    <groupId>com.yonyou.iuap</groupId>
    <artifactId>yms-core-api</artifactId>
    <version>${version}</version>
</dependency>
```

### 异常码格式

```
格式：{产品编码}-{二级分类}-{6位序号}
示例：120-230-100006
```

---

## 2. 异常等级

| level值 | 含义 | displayCode | message | detailMsg | 示意图 |
|---------|------|-------------|---------|-----------|--------|
| 0 | 错误 | √ | √ | √ | 错误提示 |
| 1 | 警告 | √ | √ | × | 警告提示 |
| 2 | 询问 | √ | √ | × | 确认提示 |
| 3-99 | 系统预留 | - | - | - | - |
| 100-999 | 领域扩展 | - | - | √ | 领域自定义 |
| 1000+ | 领域扩展 | - | - | × | 领域自定义 |

---

## 3. 标准异常响应格式

```json
{
  "code": "xxx",
  "displayCode": "120-230-100006",
  "message": "会计平台未查询到该单据的相关消息",
  "detailMsg": "请检查是否已经推送会计平台",
  "level": 0,
  "traceId": "sd00034129",
  "uploadable": 0
}
```

| 字段 | 说明 |
|------|------|
| code | 旧版异常码（如存在则保持） |
| displayCode | 新标准异常码（14位） |
| message | 异常摘要（业务含义） |
| detailMsg | 异常详情 |
| level | 异常等级：0=错误，1=警告，2=询问 |
| traceId | 链路追踪ID |
| uploadable | 是否可上报：0=否，1=是 |

---

## 4. 公共异常码

### 运行时异常

| 异常码 | 异常类型 | 说明 |
|-------|---------|------|
| 999-999-000001 | IllegalArgumentException | 非法参数异常 |
| 999-999-000002 | NullPointerException | 空指针异常 |
| 999-999-000003 | SQLSyntaxErrorException | SQL语法错误 |
| 999-999-000004 | NumberFormatException | 数字格式异常 |
| 999-999-000005 | IllegalStateException | 非法状态异常 |
| 999-999-000006 | ClassCastException | 类转换异常 |
| 999-999-000007 | StringIndexOutOfBoundsException | 字符数组越界 |
| 999-999-000008 | ArrayIndexOutOfBoundsException | 数组越界异常 |
| 999-999-000010 | UnsupportedOperationException | 不支持的操作 |
| 999-999-000011 | IndexOutOfBoundsException | 索引越界异常 |
| 999-999-000012 | ClassNotFoundException | 类找不到异常 |
| 999-999-000013 | ArithmeticException | 数学运算异常 |
| 999-999-000014 | InstantiationException | 实例化异常 |

### 分类异常

| 异常码 | 类别 | 说明 |
|-------|------|------|
| 999-999-100001 | 数据库异常 | |
| 999-999-100002 | 网络异常 | |
| 999-999-100003 | 框架异常 | |
| 999-999-100004 | Redis异常 | |
| 999-999-100005 | 消息队列异常 | |
| 999-999-100006 | RPC请求异常 | |
| 999-999-100007 | REST请求异常 | |

### 兜底异常

| 异常码 | 说明 |
|-------|------|
| 999-999-999999 | 未知异常兜底 |

---

## 5. YonBIP 异常使用示例

### 5.1 业务异常

```java
// ✅ 使用标准异常码
throw new BusinessException("120-230-100006",
                          "会计平台未查询到该单据的相关消息",
                          "请检查是否已经推送会计平台");
```

### 5.2 兜底捕获

```java
// ✅ 统一兜底捕获
@ExceptionHandler(Exception.class)
public Result handleException(Exception e) {
    if (e instanceof BusinessException be) {
        return Result.error(be);
    }

    log.error("[统一捕获异常]-[异常类型:{}]", e.getClass().getName(), e);

    var be = new BusinessException();
    be.setDisplayCode("999-999-999999");
    be.setMessage("系统异常，请稍后重试");
    be.setLevel(0);
    be.setTraceId(MDC.get("traceId"));

    return Result.error(be);
}
```

---

## 6. 异常码分配

### 产品编码

每个产品有独立的3位产品编码，如：
- 120 = 会计平台
- 230 = 某领域产品

### 二方包起始编号：001
### 微服务起始编号：501

---

## 相关文件

- `error-handling` — 通用异常处理规范（结构化错误、分层捕获、日志脱敏等）
- `stacks/yonbip-java/rules.md` — YonBIP 编码规范总览
