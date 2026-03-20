---
name: security
description: |
  YonBIP 安全编码规范。使用此 skill 当需要：
  1. 输入验证与防护
  2. 密码安全处理
  3. 输出编码
  4. XSS/CSRF 防护
  5. 文件上传安全
  6. 会话管理
  
  涵盖：SQL注入防护、密码安全、XSS防护、CSRF防护、文件安全、依赖安全
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
---

# YonBIP 安全编码规范

本 skill 提供 YonBIP 产品的安全编码规范指导。

## 快速索引

| 类别 | 说明 |
|------|------|
| [输入验证](#1-输入验证必须) | SQL注入、XPath注入、命令注入防护 |
| [密码安全](#2-密码安全必须) | 密码算法、复杂度、硬编码防护 |
| [输出安全](#3-输出安全必须) | HTML转义、JSON安全、敏感信息脱敏 |
| [XSS防护](#4-xss-防护) | 前端/后端防护措施 |
| [CSRF防护](#5-csrf-防护) | Token验证 |
| [文件上传](#6-文件上传安全) | 类型校验、大小限制、路径安全 |
| [会话管理](#7-会话管理) | Token、Cookie、超时 |
| [依赖安全](#8-依赖安全) | 漏洞扫描、组件管理 |

---

## 1. 输入验证（必须）

### 1.1 禁止动态拼接 SQL

```java
// ❌ 禁止
String sql = "SELECT * FROM user WHERE name = '" + name + "'";

// ✅ 使用预编译
var sql = """
        SELECT id, name
        FROM user
        WHERE name = ?
        """;
var ps = conn.prepareStatement(sql);
ps.setString(1, name);
```

### 1.2 禁止动态构建 XPath

```java
// ❌ 禁止
String xpath = "//user[name='" + userInput + "']";

// ✅ 使用参数化
var expression = """
        //user[@name=$name]
        """;
var xpath = XPath.newInstance(expression);
xpath.setVariable("name", userInput);
```

### 1.3 不可信输入必须编码转换

| 输出位置 | 编码方式 |
|---------|---------|
| HTML标签内 | HTML实体编码 |
| HTML属性内 | HTML属性编码 |
| JavaScript | JavaScript编码 |
| URL | URL编码 |
| CSS | CSS编码 |

### 1.4 禁止命令注入

```java
// ❌ 禁止
Runtime.exec("cmd " + userInput);

// ✅ 白名单验证
String[] allowedCommands = {"cmd1", "cmd2"};
if (Arrays.asList(allowedCommands).contains(userInput)) {
    Runtime.exec("cmd " + userInput);
}
```

---

## 2. 密码安全（必须）

### 2.1 禁止弱密码算法

```
❌ MD5
❌ SHA-1
❌ 3DES
❌ AES-128
❌ RSA-1024
❌ DES

✅ SHA-256（密码）
✅ AES-256（数据加密）
✅ RSA-2048/ECC（签名）
```

### 2.2 密码复杂度

```
长度：≥8位
包含：大写字母、小写字母、数字、特殊字符（≥3种）
禁止：包含手机号、企业名称、用户名
有效期：90天
```

### 2.3 禁止硬编码密钥

```java
// ❌ 禁止
String apiKey = "sk-1234567890";
String dbPassword = "password123";

// ✅ 使用配置中心
String apiKey = configService.getApiKey();
String dbPassword = configService.getDbPassword();
```

### 2.4 密码传输加密

```
❌ 明文传输
❌ MD5/SHA1
❌ Base64

✅ RSA
✅ SM4
✅加盐哈希
```

---

## 3. 输出安全（必须）

### 3.1 HTML输出转义

```java
// ❌ 禁止
out.println("<div>" + userInput + "</div>");

// ✅ 转义后输出
var html = """
        <div>%s</div>
        """.formatted(HtmlUtils.htmlEscape(userInput));
out.println(html);
```

### 3.2 JSON输出转义

```java
// ❌ 禁止
String json = "{\"name\":\"" + userInput + "\"}";

// ✅ 使用JSON库
var json = new JSONObject();
json.put("name", userInput);
```

### 3.3 敏感信息脱敏

| 信息类型 | 脱敏规则 |
|---------|---------|
| 身份证 | 显示首尾位，如：3\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*1 |
| 手机号 | 隐藏中间6位，如：134\*\*\*\*\*\*\*\*48 |
| 银行卡 | 仅显示后4位，如：\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*8639 |
| 地址 | 最多到区级 |

---

## 4. XSS 防护

### 4.1 前端防护

```javascript
// ❌ 禁止
element.innerHTML = userInput;

// ✅ 使用 textContent
element.textContent = userInput;

// ✅ 或使用Vue/React的默认转义
```

### 4.2 后端防护

```java
// 添加安全响应头
response.setHeader("X-Content-Type-Options", "nosniff");
response.setHeader("X-Frame-Options", "SAMEORIGIN");
var csp = """
        default-src 'self'
        """;
response.setHeader("Content-Security-Policy", csp);
```

---

## 5. CSRF 防护

```java
// 添加CSRF Token
@RequestMapping("/form")
public String form(@RequestParam String csrfToken, Model model) {
    if (!csrfValidator.validate(csrfToken)) {
        throw new SecurityException("CSRF Token无效");
    }
    // ...
}
```

---

## 6. 文件上传安全

### 6.1 文件类型校验

```java
// ❌ 禁止：只校验扩展名
String filename = "file.exe.txt";

// ✅ 校验文件魔数
byte[] header = Files.readBytes(file, 8);
String fileType = detectFileType(header);
```

### 6.2 文件大小限制

```java
// 限制上传文件大小
@MaxUploadSize fileSize = 10 * 1024 * 1024 // 10MB
```

### 6.3 文件名处理

```java
// ❌ 禁止直接使用用户文件名
String filename = userProvidedFilename;

// ✅ 重命名为随机字符串
String filename = UUID.randomUUID() + ".pdf";
```

### 6.4 文件存储路径

```java
// 禁止路径穿越
if (filename.contains("..")) {
    throw new SecurityException("非法文件名");
}
```

---

## 7. 会话管理

### 7.1 Token 要求

```
长度：≥256位
随机源：SecureRandom
包含时间戳
```

### 7.2 Cookie 安全

```java
var cookie = new Cookie("session", token);
cookie.setHttpOnly(true);    // 必须
cookie.setSecure(true);       // 必须（HTTPS）
cookie.setPath("/");
cookie.setMaxAge(3600);
```

### 7.3 会话超时

```
无活动超时：≤10分钟
绝对超时：3小时（Web端）
```

### 7.4 登录失败处理

```
失败次数：5次
锁定策略：1小时锁定或管理员解锁
失败示警：剩余次数提示
```

---

## 8. 依赖安全

### 8.1 开源组件管理

```
❌ 禁止使用有已知漏洞的组件
❌ 禁止使用 EOM 后的组件
❌ 禁止 fastjson（升级到安全版本或替换）

✅ 使用自动扫描工具检查漏洞
```

### 8.2 第三方组件安全扫描

```
工具：CheckMarx、YCG
要求：中危及以上漏洞必须修复
```

---

## 9. 代码审计要求

| 扫描类型 | 工具 | 要求 |
|---------|------|------|
| 代码扫描 | CheckMarx/YCG | 中危+必须修复 |
| 黑盒扫描 | 安全测试工具 | 中危+必须修复 |
| 渗透测试 | 安全团队 | 发现漏洞必须修复 |
