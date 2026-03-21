---
name: java-testing
description: Java + Spring Boot 测试规范。涵盖 JUnit 5 模式、Mockito、Spring Boot Test、测试分层、覆盖率要求。
triggers:
  - 编写单元测试
  - 测试驱动开发
  - JUnit 5
  - Mockito
  - 集成测试
  - 覆盖率统计
---

# Java + Spring Boot 测试规范

本规范定义了 Java 后端系统在开发过程中的测试覆盖、实现风格与验证标准。

## 1. 测试分层

系统必须在不同层级进行验证，以确保功能正确与边界安全。

- **单元测试 (Unit Test)**：测试单个 Service、Mapper、Util 类。**严禁启动 Spring 上下文**，所有依赖必须由 Mockito 填充。
- **切片测试 (Slice Test)**：针对 Web 层 (@WebMvcTest) 或持久层 (@DataJpaTest) 进行独立切片验证。
- **集成测试 (Integration Test)**：针对核心业务场景 (@SpringBootTest) 进行全链路验证，包含真实的数据库交互。

## 2. JUnit 5 模式

统一使用 JUnit 5 (Jupiter) 框架进行测试。

```java
class OrderServiceTest {

    @Test
    @DisplayName("下单：下单成功时返回订单 ID")
    void should_return_order_id_when_order_success() {
        // ... 测试逻辑 ...
    }

    @Nested
    @DisplayName("取消订单场景")
    class CancelOrderTests {
        @Test
        @DisplayName("已支付订单取消失败")
        void should_fail_when_order_already_paid() {
            // ... 测试逻辑 ...
        }
    }
}
```

### 断言推荐
统一使用 **AssertJ** 进行流式断言。
```java
assertThat(user.getName()).isEqualTo("Alice");
assertThat(orderList).hasSize(2).contains(order1, order2);
```

## 3. Mockito 使用

- **@Mock**：模拟依赖对象。
- **@InjectMocks**：将 Mock 注入待测对象。
- **verify()**：验证方法调用次数。

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void should_save_user() {
        // Given
        User user = new User("Bob");
        when(userRepository.save(any(User.class))).thenReturn(user);

        // When
        userService.register(user);

        // Then
        verify(userRepository, times(1)).save(user);
    }
}
```

## 4. Spring Boot Test

### 4.1 集成测试准备
- 使用 `@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)`。
- 对于数据库测试，建议使用 `@Sql` 脚本或 H2 内存数据库准备数据。

### 4.2 Web 切片测试
```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void should_return_200_for_valid_order() throws Exception {
        mockMvc.perform(get("/api/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }
}
```

## 5. 命名与结构

### 5.1 命名规范
推荐使用 `should_预期结果_when_前提条件` 格式。

### 5.2 结构规范 (Given-When-Then)
- **Given**：准备阶段（Mock 数据、配置）。
- **When**：执行阶段（调用待测方法）。
- **Then**：验证阶段（断言结果、校验交互）。

## 6. 覆盖率要求

使用 **JaCoCo** 插件进行覆盖率统计，并由 CI/CD 自动检查。

- **核心业务逻辑**：增量覆盖率必须 ≥ 80%。
- **Controller 路由层**：增量覆盖率必须 ≥ 70%。
- **公共工具类 (Utils)**：增量覆盖率必须 ≥ 90%。
- **配置类**：不强制覆盖。

### 质量门控示例 (Maven)
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <configuration>
        <rules>
            <rule>
                <element>BUNDLE</element>
                <limits>
                    <limit>
                        <counter>LINE</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.80</minimum>
                    </limit>
                </limits>
            </rule>
        </rules>
    </configuration>
</plugin>
```
- **禁止注释掉失败的测试**：测试失败必须修复，严禁使用 `@Disabled` 规避失败。
- **测试隔离**：测试用例之间严禁产生数据依赖，每个测试必须能够独立运行。
- **幂等性**：测试用例运行多次结果必须一致，不应受系统环境或时间影响。
