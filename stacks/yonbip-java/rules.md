# YonBIP Java 编码规范

> 本文件是 yonbip-java 技术栈的编码规范，涵盖命名、日志、代码检查、分支管理等。

## 1. 命名规范

### 1.1 微服务命名

| 类型 | 格式 | 示例 | 约束 |
|------|------|------|------|
| 平台服务 | `iuap-模块-服务短码` | `iuap-apcom-workflow` | 服务短码≤10字符 |
| 领域服务 | `yonbip-领域-服务短码` | `yonbip-scm-scmbd` | 服务短码≤10字符 |
| 行业产品 | `yonbip-i-行业编码-服务短码` | `yonbip-i-retail-xxx` | i=industry |
| 客开产品 | `yonbip-c-客开标识-服务短码` | `yonbip-c-xxx-xxx` | c=customer |
| 生态产品 | `yonbip-p-生态标识-服务短码` | `yonbip-p-xxx-xxx` | p=partner |

### 1.2 数据库命名

> 详细数据库设计规范见 `database-guidelines` skill

#### Schema（数据库）

| 类型 | 格式 | 示例 | 约束 |
|------|------|------|------|
| 平台库 | `iuap_产品_库名` | `iuap_aip_rapdb` | 总长度≤30字符 |
| 领域库 | `yonbip_领域_库名` | `yonbip_scm_pubdb` | 总长度≤30字符 |

#### 表名

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

#### 字段命名

| 类型 | 前缀/后缀 | Java类型 | 数据库类型 | 取值示例 |
|------|----------|----------|-----------|---------|
| Boolean | `b_` | Boolean | smallint | 0=false, 1=true |
| 枚举 | `e_` | String | varchar(36) | 元数据引用 |
| 参照主键 | `id` 结尾 | Long/String | bigint/varchar(36) | orgId |
| 顺序 | `i_` | Integer | int | iOrder |
| 金额 | `amount` 结尾 | BigDecimal | decimal(20,8) | natAmount |
| 数量 | `qty` 结尾 | BigDecimal | decimal(20,8) | orderQty |
| 时间 | `ts_` | Date | timestamp/f=datetime | tsCreateTime |
| 日期 | `dt_` | Date | date | dtBirthday |
| 创建人 | `creator` | String | varchar(36) | |
| 创建时间 | `createTime` | Date | timestamp | |
| 修改人 | `modifier` | String | varchar(36) | |
| 修改时间 | `modifyTime` | Date | timestamp | |

**强制字段：所有业务表必须带 `ytenant_id` 字段**

### 1.3 Redis 命名

> 详细 Redis 使用规范见 `redis-guidelines` skill

#### Key 命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 普通缓存 | `Region:租户ID:用户自定义Key` | `iuap_apcom_xx:hsnukb4g:resource123` |
| 分布式锁 | `Region:租户ID:lock:资源名` | `iuap_apcom_xx:hsnukb4g:lock:lockresourcename123` |

| 约束项 | 要求 |
|------|------|
| 业务命名长度 | ≤64字符 |
| Key 总长度 | ≤256字符 |
| 字符集 | 禁止中文及全角字符 |
| 特殊字符 | 禁止 <code>, &amp; " ' &#96; \ &lt; &gt; { } [ ] ^ % ~</code> |

### 1.4 线程池命名

```
格式：微服务编码-业务-序号
示例：yonbip-mkt-vip-dbReader-01
```

### 1.5 OSS 存储目录命名

#### 永久存储
```
客户端编码/微服务编码/perm/租户id/yyyymmddhh/对象id.扩展名
示例：iuap-apcom-file-private/iuap-apcom-file/perm/qyic8c7o/2025070219/4b6e2f2a-69db-46a6-b8e6-dd505a1316f2.xlsx
```

#### 临时存储
```
客户端编码/微服务编码/temp/租户id/yyyymmddhh/对象id.扩展名
有效期：默认90天，客户自定义不超过90天
```

---

## 2. 日志规范

### 2.1 日志格式

```
%date{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] [%logger{36}] [%X{traceId}] [%X{spanId}] [%X{pSpanId}] [%X{vtrace}] [%X{sysId}] [%X{tenantId}] [%X{userId}] [%X{profile}] [%X{agentId}] - %msg %ex%n
```

### 2.2 日志字段说明

| 字段 | 说明 | 示例 |
|------|------|------|
| date | 日志记录时间 | 2024-03-16 10:30:45.123 |
| level | 日志级别 | INFO, WARN, ERROR |
| thread | 线程名称 | http-nio-8080-exec-1 |
| logger | 类全路径 | com.yonyou.service.UserService |
| traceId | 调用链ID | 1234567890abcdef |
| tenantId | 租户id | hsnukb4g |
| userId | 登录用户id | user123 |
| profile | 环境信息 | dev/test/prod |

### 2.3 日志级别规范

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| ERROR | 异常、错误 | 系统异常、业务错误（需要关注） |
| WARN | 警告 | 配置缺失、降级处理 |
| INFO | 关键业务流程 | 订单创建、支付完成 |
| DEBUG | 调试信息 | 参数详情、中间结果 |

### 2.4 禁止用法

```java
// ❌ 禁止：用ERROR输出INFO
logger.error("用户登录成功");  // 应该用INFO

// ❌ 禁止：超大日志输出
logger.info("全部数据: {}", hugeObject);  // 应只输出关键字段

// ❌ 禁止：非必要日志
logger.debug("每行都打印");  // 会产生大量日志
```

### 2.5 Error 级别日志

```java
// ❌ 禁止：直接JSON序列化整个对象
logger.error("响应: {}", AppContext.toJson(response));

// ✅ 正确：只输出关键参数
logger.error("订单处理失败, orderId={}, userId={}", orderId, userId, e);
```

### 2.6 敏感信息

```java
// ❌ 禁止：输出密码
logger.error("登录失败, password={}", password);

// ❌ 禁止：输出身份证、银行卡号完整信息
logger.info("用户身份证: {}", idCard);

// ✅ 正确：脱敏后输出
logger.info("用户身份证: {}", maskIdCard(idCard));
```

---

## 3. 代码检查规则

### 3.1 常规规则（2024）

| 规则Key | 规则描述 | 不合规案例 | 修复建议 |
|---------|---------|-----------|---------|
| java:S131 | switch缺失default | switch无default分支 | 添加default case |
| pmd:UpperEllRule | 长整型写法规范 | `Long warn = 1l;` | `Long warn = 1L;` |
| pmd:ThreadShouldSetNameRule | 线程池未命名 | `new ThreadPoolExecutor()` | 使用YMS线程或命名 |
| pmd:AvoidCallStaticSimpleDateFormatRule | 静态SimpleDateFormat | `static SimpleDateFormat` | 使用DateTimeFormatter |
| pmd:AvoidNewDateGetTimeRule | 获取时间戳 | `new Date().getTime()` | `System.currentTimeMillis()` |
| pmd:AvoidPatternCompileInMethodRule | 正则未定义为常量 | 每次编译Pattern | 定义为static final |
| java:S2168 | 双重检查加锁 | 未用volatile修饰 | 使用静态内部类 |
| bip-sonar-java:ObjectMapperCheck | new ObjectMapper抽取 | 每次new ObjectMapper | 抽取工具类 |
| checkstyle:YonBIP_PrintStackTrace_Search | e.printStackTrace | `e.printStackTrace()` | 使用logger.error |
| checkstyle:YonBIP_double_json_no_comment | 连续2次序列化 | `fromJson(toJson(obj))` | 直接转换 |
| checkstyle:for_loop_check | 三层以上for循环 | 三层嵌套 | 重构代码 |
| YonBIP-Log-Deny-Json序列化 | Error级别JSON序列化 | `LOGGER.info("{}", toJson())` | 增加级别判断 |
| java:S2196 | 多条件字符串比较 | 多个if-else equals | 使用switch/case |
| java:S2209 | 实例引用静态方法 | `this.staticMethod()` | 使用`ClassName.staticMethod()` |
| java:S3020 | toArray传参错误 | `toArray()` | `toArray(new String[0])` |
| pmd:WrapperTypeEqualityRule | 包装类==比较 | `Long.valueOf(a) != b` | 使用equals |
| pmd:AvoidUseTimerRule | 使用Timer | `new Timer()` | 使用ScheduledExecutorService |
| java:S1105 | 括号格式 | `if(cond) xxx` | `if (cond) { xxx }` |
| java:S115 | 常量命名 | `public final static byte bFALSE` | 小写开头 |
| java:S121 | 控制结构花括号 | `if (cond) xxx;` | 使用花括号 |
| java:S6437 | 密钥硬编码 | `DESKeySpec(key.getBytes())` | 配置文件管理 |
| java:S1123 | @Deprecated无注释 | 只有注解无javadoc | 添加javadoc |

### 3.2 后端常规规则（2025）

| 规则Key | 规则描述 | 建议 |
|---------|---------|------|
| java:S1481 | 清理未使用的局部变量 | 删除未使用变量 |
| java:S1068 | 清理未使用的字段 | 删除未使用字段 |
| java:S1144 | 未使用的私有方法 | 删除或加@Used注解 |
| java:S1871 | 相同逻辑多分支 | 抽取公共方法 |
| java:S1172 | 未使用的方法参数 | 删除或加@SuppressWarnings |
| java:S1854 | 未使用的赋值 | 删除或使用赋值结果 |

### 3.3 禁止的代码模式

```java
// ❌ 禁止 e.printStackTrace()
e.printStackTrace();

// ❌ 禁止 三层以上嵌套循环
for (...) {
    for (...) {
        for (...) {
            // 超过三层
        }
    }
}

// ❌ 禁止 静态 SimpleDateFormat
static SimpleDateFormat sdf = new SimpleDateFormat();

// ❌ 禁止 使用 Timer
new Timer();

// ❌ 禁止 BigDecimal(double)
BigDecimal bd = new BigDecimal(0.1);
```

---

## 4. 分支管理规范

### 4.1 公有云分支

| 分支名称 | 用途 | 使用环境 | 操作人 | 说明 |
|---------|------|---------|--------|------|
| `feature/年份/序号` | 长期迭代开发 | 云机一体本地 | 开发人员 | >2周迭代，如：feature/2023/01 |
| `feature/迭代版本号/故事id` | 当前迭代开发 | 云机一体本地 | 开发人员 | 当周迭代，如：feature/20230324/12345 |
| `develop` | 开发测试 | 测试环境 | 研发主管 | 合并N+1迭代内容（N上线后） |
| `daily` | 功能集成联调 | 日常环境 | 研发主管 | 上线准备版本（N+1） |
| `bugfix/迭代版本号/环境/bugid` | Bug快速修复 | 日常/测试 | 开发人员 | jira驱动，完成后清理 |
| `release` | 生产稳定分支 | 预发/生产 | 研发主管 | 当前上线版本（N） |
| `hotfix/迭代版本号-fix` | 生产Bug修复 | 核心专属环境 | 开发人员 | 核心Bug修复 |

### 4.2 私有化分支

| 分支名称 | 用途 | 说明 |
|---------|------|------|
| `onpremise-VxRx_yyyyMMdd` | 金盘基线分支 | 核心上线后从release拉出，长期保留 |
| `onpremise-VxRx_yyyyMMdd_bugfix/bugid` | 合集补丁Bug修复 | 验证阶段Bug，保留3周 |
| `onpremise-VxRx_yyyyMMdd-yyyyMMdd_QP` | 合集补丁分支 | 从tag切出，用于项目紧急补丁 |
| `onpremise-VxRx_yyyyMMdd_QP_bugfix/bugid` | 紧急补丁修复 | 合集发布后的工单问题 |
| `onpremise-VxRx_yyyyMMdd_SP` | SP补丁分支 | 特殊情况下5个项目以上共性需求 |

### 4.3 分支合并规则

```
原则：自顶向下合并，不能越级

hotfix(N) ──┐
            ├──> release (N) ──┐
                                ├──> daily (N+1)
bugfix ──────> develop ─────────┘
feature ─────> develop
```

### 4.4 环境定义

| 环境名称 | 对应分支 | 说明 |
|---------|---------|------|
| 测试环境 | develop | |
| 日常多数据库 | daily | |
| 日常环境 | daily | |
| 预发环境 | release | |
| 核心1环境 | release | 华为云 |
| 核心2环境 | release | 阿里云 |
| 核心3环境 | release | 阿里云 |
| 核心4环境 | release | 腾讯云 |
| 商开环境 | release | 阿里云 |
| 海外环境 | release | 新加坡 |
| 私有化-发版 | onpremise-VxRx_yyyyMMdd | |
| 私有化-补丁 | onpremise-VxRx_yyyyMMdd | |

### 4.5 提交规范

#### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### type 类型

| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug修复 |
| docs | 文档更新 |
| style | 代码格式调整 |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具相关 |

#### 示例

```
feat(order): 添加订单取消功能

- 新增订单取消接口
- 添加取消原因枚举
- 更新订单状态流转图

Closes #123
```

---

## 5. 核心禁止项（红线）

```
❌ 禁止 keys *, flushdb, flushall, Monitor 等 Redis 阻塞命令
❌ 禁止动态拼接 SQL（使用预编译）
❌ 禁止硬编码密钥/密码
❌ 禁止使用 fastjson
❌ 禁止使用 BigDecimal(double)
❌ 禁止三层以上嵌套循环
❌ 禁止 e.printStackTrace()
❌ 禁止静态 SimpleDateFormat
❌ 禁止 eval() 执行代码
```
