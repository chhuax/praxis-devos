# API 参考文档

## 事实源

- `contracts/openapi/public.yaml`

## 范围

本文档汇总公共 API 的对外行为，真正权威的定义以 OpenAPI 契约为准。

## 接口

### `GET /health`

- 目的：检查服务健康状态
- 鉴权：无
- 成功响应：`HealthResponse`
- 契约位置：`contracts/openapi/public.yaml`

## 规则

- 不要在这里描述契约里不存在的字段。
- 破坏性变更必须同步到迁移说明中。

