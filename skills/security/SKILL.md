---
name: security
description: |
  通用安全编码规范。使用此 skill 当需要：
  1. 输入验证与各种注入防护（SQL, Command, LDAP 等）
  2. 输出编码与 XSS 防护
  3. 身份认证与会话管理最佳实践
  4. CSRF 防护与安全响应头配置
  5. 文件上传安全与敏感数据处理
  6. 依赖项安全与漏洞扫描
triggers:
  - 安全编码
  - SQL 注入
  - XSS
  - CSRF
  - 密码安全
  - 文件上传
  - 输入验证
  - 会话管理
  - 依赖漏洞
  - 敏感数据
---

# 通用安全编码规范

本 skill 提供基于 OWASP Top 10 的通用安全编码规范指导，适用于任何技术栈。

## 快速索引

| 类别 | 说明 |
|------|------|
| [1. 输入验证与注入防护](#1-输入验证与注入防护) | SQL注入、命令注入、LDAP/XPath 注入 |
| [2. 输出编码与 XSS 防护](#2-输出编码与-xss-防护) | HTML/JS/URL 编码、CSP、XSS 预防 |
| [3. 身份认证与密码安全](#3-身份认证与密码安全) | 哈希算法、MFA、硬编码防护 |
| [4. 会话管理](#4-会话管理) | Secure/HttpOnly Cookie、Token、超时 |
| [5. CSRF 防护](#5-csrf-防护) | Token 校验、SameSite 策略 |
| [6. 文件上传安全](#6-文件上传安全) | 魔数校验、随机文件名、路径穿越防护 |
| [7. 敏感数据处理](#7-敏感数据处理) | 脱敏、加密、日志安全 |
| [8. 依赖与环境安全](#8-依赖与环境安全) | 漏洞扫描 (SCA)、安全响应头 |

---

## 1. 输入验证与注入防护

### 1.1 SQL 注入防护
必须使用参数化查询（Prepared Statements），严禁拼接字符串构建 SQL。

```java
// ✅ Java (JDBC/MyBatis/JPA)
var sql = "SELECT id, name FROM users WHERE email = ?";
var ps = conn.prepareStatement(sql);
ps.setString(1, userEmail);

// ✅ JavaScript (Node.js pg/mysql2)
const results = await db.query('SELECT id, name FROM users WHERE email = $1', [userEmail]);

// ❌ 严禁拼接
const sql = "SELECT * FROM users WHERE email = '" + userEmail + "'";
```

### 1.2 命令注入防护
尽量避免调用系统命令。如必须调用，使用 API 而非 shell 字符串，并进行严格的参数白名单校验。

```java
// ✅ 使用数组形式调用，不经过 shell 解析
new ProcessBuilder("ls", "-l", directoryPath).start();

// ❌ 拼接 shell 字符串
Runtime.getRuntime().exec("sh script.sh " + userInput);
```

### 1.3 其他注入 (LDAP, XPath, Header)
所有进入系统的外部数据都应视为不可信，必须根据上下文进行验证或过滤。

---

## 2. 输出编码与 XSS 防护

### 2.1 上下文相关的输出编码
根据数据输出的位置选择正确的编码方式。

| 输出位置 | 编码/处理方式 |
|---------|---------|
| HTML Body | HTML 实体编码 (e.g. `<` -> `&lt;`) |
| HTML Attribute | HTML 属性编码 |
| JavaScript 变量 | JavaScript 编码 (JSON.stringify 或专用库) |
| URL 参数 | URL 编码 (percent-encoding) |
| CSS 样式 | CSS 编码 |

### 2.2 前端防御 (DOM-based XSS)
避免使用直接解析 HTML 的 API。

```javascript
// ✅ 使用 textContent (自动转义)
element.textContent = userInput;

// ❌ 使用 innerHTML (易受攻击)
element.innerHTML = userInput;
```

### 2.3 内容安全策略 (CSP)
通过响应头限制资源加载来源。
`Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com;`

---

## 3. 身份认证与密码安全

### 3.1 强密码哈希
严禁使用 MD5, SHA-1 等快速哈希算法。必须使用加盐的慢速哈希算法。

```java
// ✅ 使用 Argon2 或 bcrypt
String hash = BCrypt.withDefaults().hashToString(12, password.toCharArray());

// ❌ 严禁使用 MD5 或纯 SHA-256
MessageDigest.getInstance("MD5").digest(password.getBytes());
```

### 3.2 严禁硬编码
密钥、凭证必须存储在环境变量、配置文件（加密）或密钥管理服务（KMS）中。

```javascript
// ✅ 从环境读取
const apiKey = process.env.API_KEY;

// ❌ 留在代码里
const apiKey = "sk_live_51M...";
```

### 3.3 多因素认证 (MFA)
对于特权操作或敏感账户，应强制开启 MFA (TOTP, WebAuthn 等)。

---

## 4. 会话管理

### 4.1 安全 Cookie
所有身份凭证 Cookie 必须设置安全标志。

```javascript
// ✅ Node.js/Express 示例
res.cookie('sessionID', token, {
  httpOnly: true, // 防止 JS 读取
  secure: true,   // 仅通过 HTTPS 传输
  sameSite: 'Strict', // 防范 CSRF
  maxAge: 3600000 // 设置合理的过期时间
});
```

### 4.2 会话生命周期
- **超时退出**：设置合理的绝对超时和无活动超时。
- **重新登录**：在修改密码、绑定邮箱等敏感操作前要求重新验证。

---

## 5. CSRF 防护

### 5.1 Token 机制
在所有状态变更请求（POST, PUT, DELETE）中要求携带不可预测的 CSRF Token。

### 5.2 SameSite Cookie
将 Cookie 的 `SameSite` 属性设为 `Lax` 或 `Strict` 作为第一道防线。

---

## 6. 文件上传安全

### 6.1 内容验证
不能仅依赖文件扩展名或 Content-Type，必须检查文件头（Magic Bytes）。

```java
// ✅ 检查魔数
byte[] header = readHeader(file);
if (!isAllowedImage(header)) { throw new SecurityException(); }
```

### 6.2 存储安全
- **随机文件名**：上传后重命名文件（如 UUID），防止文件名导致的溢出或特殊字符攻击。
- **存储路径**：严禁通过用户输入构造路径，防止路径穿越（Path Traversal）。
- **执行权限**：确保上传目录没有执行权限（No-Execute）。

---

## 7. 敏感数据处理

### 7.1 日志脱敏
严禁在日志中记录密码、CVV、完整身份证号或个人通讯隐私。

```java
// ✅ 脱敏处理
logger.info("User {} logged in", maskUser(userId));
```

### 7.2 加密存储
- **静态数据 (At Rest)**：使用 AES-256 等对称加密算法存储敏感信息。
- **传输中数据 (In Transit)**：强制使用 TLS 1.2+。

---

## 8. 依赖与环境安全

### 8.1 组件漏洞扫描 (SCA)
集成自动化工具定期扫描项目依赖。
- **工具建议**：Snyk, GitHub Dependabot, OWASP Dependency-Check, Trivy。

### 8.2 安全响应头
配置基础安全头以增强浏览器端的防御。

| Header | 推荐值 | 作用 |
|--------|--------|------|
| `X-Content-Type-Options` | `nosniff` | 禁止浏览器猜测内容类型 |
| `X-Frame-Options` | `DENY` 或 `SAMEORIGIN` | 防范点击劫持 (Clickjacking) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | 强制 HSTS (HTTPS) |
| `Referrer-Policy` | `no-referrer-when-downgrade` | 控制 Referrer 信息泄露 |

---

## 9. 持续安全验证

- **静态扫描 (SAST)**：在 CI 中运行代码扫描（如 SonarQube, Semgrep）。
- **动态扫描 (DAST)**：对运行中的应用进行黑盒测试（如 OWASP ZAP）。
- **安全审计**：重大变更或发版前进行人工代码审计或渗透测试。
