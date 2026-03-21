---
name: yonbip-redis
description: |
  YonBIP Redis 使用规范扩展。在通用 redis-guidelines skill 基础上，提供 YonBIP 产品特有的：
  1. 多租户 Key 设计（Region:租户ID:Key）
  2. YMSRedisTemplate 使用
  3. Region/数据源命名规范
  4. 主从/持久化配置
  
  本 skill 扩展通用 redis-guidelines，不可独立使用。
triggers:
  - YMSRedisTemplate
  - Region
  - YonBIP Redis
  - 租户ID Key
  - iuap_apcom
---

# YonBIP Redis 使用规范（栈专属扩展）

> 本 skill 是 `redis-guidelines`（通用）的 **YonBIP 栈扩展**。通用 Redis 最佳实践请参考通用 skill。

## 1. 多租户 Key 设计

### 1.1 命名格式

```
格式：Region:租户ID:用户自定义Key
示例：iuap_apcom_xx:hsnukb4g:resource123
```

### 1.2 设计要求

| 约束项 | 要求 |
|------|------|
| 业务命名长度 | ≤64字符 |
| Key 总长度 | ≤256字符 |
| 字符集 | 禁止中文及全角字符 |
| 特殊字符 | 禁止 <code>, &amp; " ' &#96; \ &lt; &gt; { } [ ] ^ % ~</code> |

### 1.3 租户ID缺失时用 `N` 替代

### 1.4 分布式锁命名

```
格式：Region:租户ID:lock:资源名
示例：iuap_apcom_xx:hsnukb4g:lock:lockresourcename123

要求：锁时长≤10分钟
```

---

## 2. YMSRedisTemplate 使用

```java
// ❌ 禁止短连接
Jedis jedis = new Jedis("localhost");
jedis.close();

// ✅ 使用 YMS 提供的连接池
@Resource
private YMSRedisTemplate redisTemplate;
```

---

## 3. Region（数据源）命名

| 类型 | 格式 |
|------|------|
| 平台 | `iuap_模块_服务短码` |
| 领域 | `yonbip_领域编码_服务短码` |

---

## 4. 持久化规范

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

## 相关文件

- `redis-guidelines` — 通用 Redis 使用规范（命令规范、Key 设计原则、缓存模式等）
- `stacks/yonbip-java/rules.md` — YonBIP 编码规范总览
