---
name: java-error-handling
description: Java + Spring Boot 异常处理规范。涵盖异常分类、BusinessException 模式、RFC 7807 结构化响应、全局异常处理器。
triggers:
  - 异常处理
  - 错误定义
  - 自定义异常
  - ExceptionHandler
  - 响应结构
---

# Java + Spring Boot 异常处理规范

本规范定义了 Java 后端系统的异常分类、处理流程与统一错误响应结构。

## 1. 错误分类

系统错误应分为以下四大类：
- **客户端错误 (400s)**：请求格式错误、参数校验失败。
- **业务逻辑异常 (422/400)**：业务规则验证失败（如：余额不足、用户名已存在）。
- **系统内部错误 (500s)**：数据库超时、空指针、三方服务中断。
- **未知异常 (500)**：未捕获的运行时异常，需由全局处理器统一拦截。

## 2. BusinessException 模式

建议定义一个基础业务异常类，包含错误码、消息和可选数据：

```java
public class BusinessException extends RuntimeException {
    private final String errorCode;
    private final Object[] args;

    public BusinessException(String errorCode, String message, Object... args) {
        super(message);
        this.errorCode = errorCode;
        this.args = args;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
```

### 错误码设计 (MODULE-CATEGORY-NUMBER)
- **USER-AUTH-001**：登录失效
- **ORDER-VAL-005**：订单金额非法

## 3. 标准错误响应 (RFC 7807)

系统必须返回结构化的 JSON 错误信息。遵循 RFC 7807 规范：

```json
{
  "type": "https://api.example.com/errors/invalid-order",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "订单支付金额不足",
  "instance": "/v1/orders/123",
  "errorCode": "ORDER-PAY-002",
  "traceId": "x-req-id-12345",
  "errors": [
    {
      "field": "amount",
      "message": "支付金额必须大于 0"
    }
  ]
}
```

## 4. 全局异常处理器

使用 `@RestControllerAdvice` 统一捕获异常。

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
        log.warn("业务异常 [{}]: {}", e.getErrorCode(), e.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ErrorResponse(e.getErrorCode(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        List<ValidationError> errors = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new ValidationError(f.getField(), f.getDefaultMessage()))
                .collect(Collectors.toList());
        return ResponseEntity.badRequest().body(new ErrorResponse("VAL-001", "校验失败", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
        log.error("系统崩溃", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("SYS-999", "服务暂不可用，请稍后再试"));
    }
}
```

## 5. 异常传播规范

- **Repository 层**：捕获 SQL 异常，封装后重新抛出或直接抛出运行时异常。
- **Service 层**：负责核心业务校验，并抛出 `BusinessException`。
- **Controller 层**：严禁使用 `try-catch` 捕获异常，由全局处理器自动拦截。

## 6. 最佳实践

### 6.1 禁止吞没异常
绝对禁止空 catch 块。必须至少记录一条 ERROR 日志并包含堆栈。

### 6.2 记录上下文
抛出异常时，应尽可能携带相关业务参数。
```java
throw new BusinessException("ORD-001", "订单不存在", Map.of("orderId", id));
```

### 6.3 日志脱敏
记录异常时，严禁将用户明文密码、银行卡号等敏感信息直接打入日志。

### 6.4 分层原则
Service 层应屏蔽底层技术细节（如 MyBatis 报错或 HTTP 404），将其转化为易读的业务消息。
