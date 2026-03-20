---
name: error-handling
description: |
  YonBIP 异常处理规范与统一响应格式。使用此 skill 当需要：
  1. 处理业务异常
  2. 设计异常码体系
  3. 统一响应格式
  4. 全局异常捕获
  
  涵盖：标准异常组件、异常码格式、异常等级、响应格式、HTTP 状态码
triggers:
  - 异常处理
  - 异常码
  - BusinessException
  - 统一响应
  - 全局异常捕获
  - displayCode
  - traceId
  - HTTP 状态码
---

# YonBIP 异常处理规范

本 skill 提供 YonBIP 产品的异常处理规范和统一响应格式。

## 快速索引

| 类别 | 说明 |
|------|------|
| [标准异常组件](#1-标准异常组件) | Maven 依赖与异常码格式 |
| [异常等级](#2-异常等级) | 0-99 等级定义 |
| [响应格式](#3-标准异常响应格式) | JSON 响应结构 |
| [公共异常码](#4-公共异常码) | 运行时异常、分类异常、兜底异常 |
| [处理规范](#5-异常处理规范) | 业务异常、兜底捕获、禁止模式 |
| [HTTP状态码](#6-http-状态码) | 状态码与处理方式 |

---

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

## 5. 异常处理规范

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

### 5.3 禁止的异常处理

```java
// ❌ 禁止
catch (Exception e) {
    e.printStackTrace();  // 无效打印
}

// ❌ 禁止
catch (Exception e) {
    // 吞掉异常
}

// ❌ 禁止
throw new RuntimeException("错误");  // 不规范

// ✅ 正确
catch (Exception e) {
    log.error("操作失败", e);
    throw new BusinessException("120-230-100001", "操作失败", e.getMessage());
}
```

---

## 6. HTTP 状态码

| 状态码 | 含义 | 处理方式 |
|-------|------|---------|
| 200 | 成功 | 前端不显示 |
| 500 | 标准异常码 | 警告提示/错误提示 |
| 401 | 未登录 | 跳转登录页 |
| 403 | 拒绝访问 | 无权限提醒 |
| 404 | 页面找不到 | 友好提示页面 |
| 502 | 错误网关 | 友好提示页面 |
| 503 | 服务不可用 | 友好提示页面 |
| 504 | 网关超时 | 友好提示页面 |

---

## 7. 异常码分配

### 产品编码

每个产品有独立的3位产品编码，如：
- 120 = 会计平台
- 230 = 某领域产品

### 二方包起始编号：001
### 微服务起始编号：501

---

## 8. 异常日志要求

### Error 级别日志

```java
// ❌ 禁止在 Error 级别 JSON 序列化整个对象
log.error("响应: {}", AppContext.toJson(responseObject));

// ✅ 只输出关键参数
log.error("操作失败, orderId={}, userId={}", orderId, userId, e);
```

### 敏感信息

```java
// ❌ 禁止输出密码
log.error("密码错误: {}", password);

// ✅ 不记录敏感信息
log.error("用户登录失败, userId={}", userId);
```
