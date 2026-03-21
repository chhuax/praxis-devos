---
name: java-security
description: Java + Spring Boot 安全编码规范。涵盖输入验证、注入防护、Spring Security 配置、密码安全、会话管理、依赖扫描。
triggers:
  - 安全开发
  - 输入验证
  - Spring Security
  - 密码加密
  - JWT
  - SQL 注入
---

# Java + Spring Boot 安全编码规范

本规范定义了 Java 后端系统在开发过程中的安全防护准则。

## 1. 输入验证

所有外部输入必须经过验证，不能信任任何来自客户端的数据。

### 1.1 Bean Validation
使用 Hibernate Validator (Spring Boot 默认集成) 对 DTO 进行声明式校验。

```java
public class UserRegistrationDto {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 4, max = 20, message = "用户名长度必须在 4-20 之间")
    private String username;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z]).{8,}$", message = "密码强度不足")
    private String password;
}

@RestController
@RequestMapping("/api/users")
public class UserController {
    @PostMapping
    public ResponseEntity<Void> register(@Valid @RequestBody UserRegistrationDto dto) {
        // ... 业务处理 ...
        return ResponseEntity.ok().build();
    }
}
```

### 1.2 自定义校验器
对于复杂的业务校验（如查重、复杂组合规则），必须实现 `ConstraintValidator`。

## 2. SQL 注入防护

严禁使用字符串拼接构建 SQL，必须使用参数化查询。

- **MyBatis**：统一使用 `#{}`，严禁在 `ORDER BY` 或 `IN` 子句中使用 `${}`（除非已由代码严格校验）。
- **JPA**：使用 `@Query` 时必须绑定参数。
- **JDBC**：使用 `PreparedStatement`。

```java
// JPA 安全参数绑定
@Query("SELECT u FROM User u WHERE u.username = :name")
User findByName(@Param("name") String name);
```

## 3. 密码安全

- **加密存储**：严禁使用 MD5 或 SHA-1。必须使用具备加盐能力的哈希算法，如 **BCrypt**。
- **密码编码器**：使用 Spring Security 提供的 `BCryptPasswordEncoder`。

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}

// 存储时加密
String encodedPassword = passwordEncoder.encode(rawPassword);
// 校验时比对
boolean matches = passwordEncoder.matches(rawPassword, storedPassword);
```

## 4. Spring Security 配置

配置必须显式声明最小权限原则。

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // 根据业务场景启用或关闭
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );
        return http.build();
    }
}
```

## 5. 会话与 Token 管理

### 5.1 Cookie 安全
如果是使用 Cookie 存储 SessionID，必须设置：
- `HttpOnly`：防止 XSS 窃取 Cookie。
- `Secure`：强制仅在 HTTPS 下传输。
- `SameSite=Strict/Lax`：防御 CSRF 攻击。

### 5.2 JWT 最佳实践
- **短期效期**：Access Token 建议 15-30 分钟。
- **Refresh Token**：通过 Refresh Token 刷新 Access Token。
- **签名算法**：使用 RS256 (非对称加密) 优于 HS256。

## 6. 依赖安全

- **扫描机制**：在 CI/CD 中集成 OWASP Dependency-Check 插件。
- **Maven 插件配置**：
```xml
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>9.0.0</version>
    <executions>
        <execution>
            <goals><goal>check</goal></goals>
        </execution>
    </executions>
</plugin>
```
- **漏洞修补**：发现 CVE 风险后，必须在 48 小时内完成依赖升级。
- **环境安全**：严禁在代码中硬编码任何 API 密钥或数据库密码。应使用环境变量或 Secret Manager。
