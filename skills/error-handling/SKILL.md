---
name: error-handling
1: ---
2: name: error-handling
3: description: |
4:   通用异常处理规范与统一响应格式。使用此 skill 当需要：
5:   1. 设计或实现业务异常（Business Exception）
6:   2. 设计层级化的异常码体系
7:   3. 定义标准的错误响应格式（参考 RFC 7807）
8:   4. 实现全局异常处理器（Global Exception Handler）
9:   
10:   涵盖：错误分类、异常传播、日志规范、HTTP 状态码映射、结构化响应
11: triggers:
12:   - 异常处理
13:   - 异常码
14:   - BusinessException
15:   - 统一响应
16:   - 全局异常捕获
17:   - 错误分类
18:   - traceId
19:   - HTTP 状态码
20: ---
21: 
22: # 通用异常处理规范
23: 
24: 本规范定义了跨技术栈通用的异常处理原则，旨在提高系统的可观测性、健壮性和前后端协作效率。
25: 
26: ## 快速索引
27: 
28: | 类别 | 说明 |
29: |------|------|
30: | [错误分类](#1-错误分类) | 业务异常 vs 系统异常，客户端 vs 服务端 |
31: | [异常码设计](#2-异常码设计原则) | 层级化、可读性与唯一性 |
32: | [响应格式](#3-标准错误响应格式) | 基于 RFC 7807 的结构化响应 |
33: | [异常传播](#4-异常传播规范) | 分层架构中的捕获与抛出原则 |
34: | [处理模式](#5-异常处理模式) | 全局拦截、捕获日志重抛、禁止吞掉异常 |
35: | [HTTP状态码](#6-http-状态码映射) | 业务错误与 HTTP 状态码的映射关系 |
36: 
37: ---
38: 
39: ## 1. 错误分类
40: 
41: 异常应根据来源和可恢复性进行分类，避免所有错误都混淆为单一类型。
42: 
43: | 分类 | 说明 | 示例 | 建议 HTTP 码 |
44: |------|------|------|------------|
45: | **客户端错误 (Client)** | 输入非法、权限不足、资源不存在 | 参数校验失败、Token 过期 | 400, 401, 403, 404 |
46: | **业务异常 (Business)** | 符合语法但违反业务逻辑 | 余额不足、订单已支付 | 422 (Unprocessable Content) 或 200/500 |
47: | **系统异常 (System)** | 基础设施故障、第三方服务不可用 | 数据库连接超时、磁盘满 | 500, 502, 503, 504 |
48: | **未知错误 (Unknown)** | 未预期的运行时异常 | NullPointerException | 500 |
49: 
50: ---
51: 
52: ## 2. 异常码设计原则
53: 
54: 异常码（Error Code）应同时具备机器可解析性和人类可读性。
55: 
56: - **层级化**：建议采用 `模块-分类-编号` 结构（如 `USER-AUTH-001`）。
57: - **唯一性**：每个具体的错误场景对应唯一的错误码。
58: - **文档化**：错误码应有对应的文档说明，包含触发原因和解决建议。
59: 
60: ✅ **推荐格式**：
61: - `ORDER_NOT_FOUND` (字符串常量，易读)
62: - `100-04-001` (数字/字母组合，适合大型分布式系统)
63: 
64: ---
65: 
66: ## 3. 标准错误响应格式
67: 
68: 参考 RFC 7807 (Problem Details for HTTP APIs)，提供结构化的 JSON 响应。
69: 
70: ```json
71: {
72:   "type": "https://example.com/probs/out-of-stock",
73:   "title": "库存不足",
74:   "status": 422,
75:   "detail": "商品 [ID: 12345] 当前库存为 0，无法完成下单。",
76:   "instance": "/orders/98765",
77:   "errorCode": "SHOP-ORDER-001",
78:   "traceId": "a1b2c3d4e5f6g7h8",
79:   "errors": [
80:     { "field": "quantity", "message": "必须大于 0" }
81:   ]
82: }
83: ```
84: 
85: | 字段 | 说明 |
86: |------|------|
87: | type | 指向错误类型文档的 URI |
88: | title | 错误的简短摘要（人类可读） |
89: | status | 对应的 HTTP 状态码 |
90: | detail | 针对本次发生的详细解释 |
91: | errorCode | 内部定义的业务错误码 |
92: | traceId | 用于链路追踪的唯一请求 ID |
93: | errors | （可选）多处字段校验失败时的详细列表 |
94: 
95: ---
96: 
97: ## 4. 异常传播规范
98: 
99: 在分层架构中，应明确每一层的异常职责。
100: 
101: 1. **DAO/Repository 层**：不应处理业务逻辑，抛出底层的持久化异常（如 `DataAccessException`）。
102: 2. **Service 层**：捕获底层异常，转化为 **业务异常 (BusinessException)** 抛出。**严禁返回错误码字符串**，应使用异常机制中断流程。
103: 3. **Controller/API 层**：作为异常的终点，由全局处理器捕获异常并转换为标准响应格式。
104: 
105: ---
106: 
107: ## 5. 异常处理模式
108: 
109: ### 5.1 抛出业务异常
110: 
111: ```java
112: // ✅ 使用自定义业务异常，包含错误码和上下文
113: if (user == null) {
114:     throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在: " + userId);
115: }
116: ```
117: 
118: ### 5.2 全局异常拦截 (Spring 示例)
119: 
120: ```java
121: @RestControllerAdvice
122: public class GlobalExceptionHandler {
123: 
124:     @ExceptionHandler(BusinessException.class)
125:     public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
126:         log.warn("业务异常: {}", e.getMessage());
127:         return ResponseEntity.status(e.getHttpStatus())
128:                              .body(new ErrorResponse(e.getCode(), e.getMessage()));
129:     }
130: 
131:     @ExceptionHandler(Exception.class)
132:     public ResponseEntity<ErrorResponse> handleSystemException(Exception e) {
133:         // 记录堆栈信息，生成 traceId
134:         String traceId = TraceContext.getTraceId();
135:         log.error("系统未知错误 [traceId: {}]", traceId, e); 
136:         
137:         return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
138:                              .body(new ErrorResponse("SYSTEM_ERROR", "系统开小差了，请稍后再试", traceId));
139:     }
140: }
141: ```
142: 
143: ### 5.3 最佳实践与禁止模式
144: 
145: ```java
146: // ❌ 禁止：吞掉异常而不处理或不记录
147: try { 
148:     doSomething(); 
149: } catch (Exception e) {} 
150: 
151: // ❌ 禁止：只打印堆栈而不抛出（除非是顶层异步任务）
152: try { 
153:     doSomething(); 
154: } catch (Exception e) { 
155:     e.printStackTrace(); 
156: }
157: 
158: // ✅ 正确：记录上下文并重新抛出/转化
159: try {
160:     externalClient.call();
161: } catch (IOException e) {
162:     log.error("调用第三方接口失败, param={}", param, e);
163:     throw new ServiceUnavailableException("外部服务不可用", e);
164: }
165: ```
166: 
167: ---
168: 
169: ## 6. HTTP 状态码映射
170: 
171: 业务错误应尽量映射到语义接近的 HTTP 状态码。
172: 
173: | 业务场景 | 推荐 HTTP 状态码 |
174: |---------|-----------------|
175: | 请求参数缺失、格式错误 | 400 Bad Request |
176: | 身份认证失败（未登录） | 401 Unauthorized |
177: | 权限不足（无权操作该资源） | 403 Forbidden |
178: | 找不到对应 ID 的资源 | 404 Not Found |
179: | 并发修改冲突（如乐观锁失败） | 409 Conflict |
180: | 业务逻辑不通过（如余额不足） | 422 Unprocessable Entity |
181: | 触发限流 | 429 Too Many Requests |
182: | 服务器内部不可恢复错误 | 500 Internal Server Error |
183: | 下游服务超时/不可用 | 503 Service Unavailable |
184: 
185: ---
186: 
187: ## 7. 日志脱敏与脱噪
188: 
189: - **敏感数据遮蔽**：日志中严禁出现明文密码、信用卡号、SKU 私密信息等。
190: - **日志脱噪**：对于预期的业务异常（如参数校验失败），使用 `WARN` 级别且不记录完整堆栈；对于非预期的系统异常，使用 `ERROR` 级别并记录完整堆栈。
191: - **结构化日志**：包含 `traceId` 或 `correlationId`，确保能跨服务追踪。
192: 
193: ```java
194: // ✅ 结构化日志示例
195: log.error("Order payment failed | orderId={} | userId={} | reason={}", orderId, userId, reason, e);
196: ```
197: 
198: ---
199: 
200: ## 8. 总结
201: 
202: 良好的异常处理不仅是为了修复错误，更是为了让系统在失败时：
203: 1. **能感知**（有日志，有告警）
204: 2. **可定位**（有 traceId，有上下文）
205: 3. **对用户友好**（有清晰的提示，不暴露内部技术细节）
206: 4. **对开发者友好**（代码逻辑清晰，不被冗长的 try-catch 淹没）
