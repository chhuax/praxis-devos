---
name: redis-guidelines
description: |
  YonBIP Redis 使用规范。使用此 skill 当需要：
  1. Redis 缓存操作
  2. 分布式锁
  3. Key 设计
  4. 过期策略
  
  涵盖：禁止命令、命令规范、Key设计、过期策略、连接规范、Value大小
triggers:
  - Redis
  - 缓存
  - 分布式锁
  - Key 设计
  - 过期策略
  - pipeline
  - scan
---

# YonBIP Redis 使用规范

本 skill 提供 YonBIP 产品的 Redis 使用规范指导。

## 快速索引

| 类别 | 说明 |
|------|------|
| [禁止命令](#1-禁止命令红线) | keys*、flushdb 等阻塞命令 |
| [命令规范](#2-命令使用规范) | 推荐命令与使用要求 |
| [Key设计](#3-key-设计规范) | 命名格式与设计要求 |
| [过期策略](#4-过期时间规范) | 分散过期、设置方式 |
| [连接规范](#5-连接规范) | 连接池、阻塞防护 |
| [Value规范](#6-value-大小规范) | 大小限制与建议 |
| [淘汰策略](#7-淘汰策略) | LRU 等策略选择 |
| [使用场景](#8-使用场景) | 分布式锁、限流等 |

---

## 1. 禁止命令（红线）

```text
❌ keys *
❌ flushdb / flushall
❌ Monitor
❌ Smembers (大数据量)
❌ hgetall (大数据量)
❌ config
❌ 多DB（公有云禁止）
❌ multi 事务
❌ 短连接
```

---

## 2. 命令使用规范

### 推荐命令

| 操作 | 推荐命令 | 说明 |
|------|---------|------|
| 查询Key | scan | 每次取1000 |
| Hash查询 | hscan | 每次取1000 |
| Set查询 | sscan | 每次取1000 |
| ZSet查询 | zscan | 每次取1000 |
| 批量执行 | pipeline | 每次≤100个key |
| 删除 | unlink | 异步删除（Redis 4.0+） |

### 使用要求

1. **推荐使用 O(1) 操作命令**

2. **禁止使用 O(N) 命令**（除非N很小）

3. **使用 pipeline 批量执行**，每次≤100个key

4. **推荐使用 Lua 脚本**保证原子性

---

## 3. Key 设计规范

### 命名格式

```
格式：Region:租户ID:用户自定义Key
示例：iuap_apcom_xx:hsnukb4g:resource123
```

### 设计要求

1. **Key 必须具备业务含义**

2. **Key 必须具备可读性**

3. **Key 长度≤2KB**（推荐≤64字符）

4. **禁止使用中文及全角字符**

5. **禁止特殊字符**：`, " ' ` \ < > { } [ ] & ^ % ~`

6. **租户ID缺失时用 `N` 替代**

### 分布式锁命名

```
格式：Region:租户ID:lock:资源名
示例：iuap_apcom_xx:hsnukb4g:lock:lockresourcename123

要求：锁时长≤10分钟
```

---

## 4. 过期时间规范

### 分散过期

```
❌ 集中过期：所有Key在同一时间点过期
✅ 分散过期：过期时间加随机值（如±10%）

示例：
基础过期时间 = 3600秒
实际过期时间 = 3600 + random(-360, 360)
```

### 过期时间设置

```java
// ❌ 集中过期
redis.expire(key, 3600);

// ✅ 分散过期
int baseExpire = 3600;
int randomExpire = ThreadLocalRandom.current().nextInt(-360, 361);
redis.expire(key, baseExpire + randomExpire);
```

---

## 5. 连接规范

### 必须使用长连接池

```java
// ❌ 禁止短连接
Jedis jedis = new Jedis("localhost");
jedis.close();

// ✅ 使用连接池
@Resource
private YMSRedisTemplate redisTemplate;
```

### 禁止阻塞 Redis

1. **Redis 6 以下单线程服务**

2. **避免大量数据一次性操作**

3. **大Key拆分处理**

---

## 6. Value 大小规范

| 类型 | 大小限制 | 建议 |
|------|---------|------|
| String | ≤512MB | ≤10KB |
| Hash | ≤2^32-1 个键值对 | 单个Hash≤1000字段 |
| List | ≤2^32-1 个元素 | 单个List≤10000元素 |
| Set | ≤2^32-1 个元素 | 单个Set≤10000元素 |
| ZSet | ≤2^32-1 个元素 | 单个ZSet≤10000元素 |

---

## 7. 淘汰策略

| 策略 | 说明 | 推荐度 |
|------|------|--------|
| volatile-lru | 过期key中LRU | ✅ 推荐 |
| allkeys-lru | 所有key中LRU | ✅ 一般推荐 |
| noeviction | 不删除，返回错误 | ⚙️ 默认 |

---

## 8. 使用场景

| 场景 | 推荐方案 |
|------|---------|
| 分布式锁 | SET NX + Lua |
| 限流 | Lua + INCR |
| 幂等性 | Token + Redis |
| 热点数据 | Redis + 过期时间 |
| 排行榜 | ZSet |
| 计数器 | String + INCR |

---

## 9. 持久化规范

### 主从配置

```
主节点：关闭 AOF
从节点：开启 AOF
```

### 备份规范

1. **业务高峰期禁止备份**

2. **优先从从节点备份**

3. **使用 RDB 而非 AOF**（性能考虑）

---

## 10. Region（数据源）命名

| 类型 | 格式 |
|------|------|
| 平台 | `iuap_模块_服务短码` |
| 领域 | `yonbip_领域编码_服务短码` |
