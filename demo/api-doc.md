# add-config-compare-api 接口文档

## 1. 接口概览

- 接口名称：统一配置对比
- 请求路径：`POST /config-service/web/v3/config/compare`
- 接口归属：`YMSConfigController`
- 权限要求：配置只读权限
- 返回模型：`List<YmsConfigDiff>`

## 2. 接口说明

用于对两份配置 JSON 文本进行差异对比。调用方通过 `compareType` 指定对比语义：

- `middleware`：中间件配置对比
- `global`：全局配置对比
- `microservice`：微服务配置对比

接口内部会根据类型进行 JSON 解析、合法性校验、默认 `configApp` 推导以及差异计算。

## 3. 请求参数

### 3.1 Body

```json
{
  "compareType": "middleware",
  "oldConfig": "{...}",
  "newConfig": "{...}",
  "appCode": "yh-mwclient-provider-yh",
  "configApp": "middleware"
}
```

### 3.2 字段定义

| 字段            | 类型     | 必填 | 说明                                           |
|---------------|--------|----|----------------------------------------------|
| `compareType` | string | 是  | 对比类型，支持 `middleware`、`global`、`microservice` |
| `oldConfig`   | string | 否  | 旧配置 JSON 文本                                  |
| `newConfig`   | string | 否  | 新配置 JSON 文本                                  |
| `appCode`     | string | 是  | 应用编码                                         |
| `configApp`   | string | 否  | 配置应用名，为空时按 compareType 使用默认值                 |

### 3.3 `configApp` 默认规则

| compareType    | 默认 `configApp`  |
|----------------|-----------------|
| `middleware`   | `middleware`    |
| `global`       | `yonbip_config` |
| `microservice` | `appCode`       |

## 4. 返回参数

### 4.1 成功响应

```json
{
  "code": "YMS-000000",
  "msg": "success",
  "data": [
    {
      "module": "datasources",
      "code": "yh-mwclient-provider-yh_yhDs",
      "column": "defaultDs",
      "operation": "update",
      "oldValue": "yh-microservice-test",
      "newValue": "yh-microservice-test2"
    }
  ]
}
```

### 4.2 `data` 字段说明

`data` 为 `List<YmsConfigDiff>`，按既有 compare 语义输出差异项，典型字段含义如下：

| 字段          | 说明                               |
|-------------|----------------------------------|
| `module`    | 差异所属模块或配置域                       |
| `code`      | 差异对象编码                           |
| `column`    | 差异字段或路径列名                        |
| `operation` | 操作类型，常见为 `add`、`delete`、`update` |
| `oldValue`  | 旧值                               |
| `newValue`  | 新值                               |

## 5. 业务规则

### 5.1 类型分发规则

- `middleware` 走中间件 compare 语义
- `global` 走全局配置 compare 语义
- `microservice` 走模块配置 compare 语义

### 5.2 忽略规则

接口会在对比前应用后端规则文件中的忽略规则，当前重点包括：

- 审计字段忽略
- `_meta` 子树忽略
- `_itemDesc` 子树忽略
- 部分噪音字段和场景专属路径忽略

忽略规则文件位置：

- `iuap-yms-console-sdk/src/main/resources/config-compare-ignore-rules.json`

### 5.3 结果语义

- 保持现有 `YmsConfigDiff` 结构不变
- 保持顶层对象 add/delete 语义
- 保持深度比较语义
- 保持 keyed-list 比较语义

## 6. 错误场景

### 6.1 不支持的 compareType

- 条件：`compareType` 不在支持范围内
- 结果：返回参数错误类异常

### 6.2 非法 JSON

- 条件：`oldConfig` 或 `newConfig` 对于所选 compareType 不是合法 JSON
- 结果：返回参数错误类异常

### 6.3 缺少必填项

- 条件：`compareType` 或 `appCode` 为空
- 结果：请求校验失败

## 7. 调用示例

### 7.1 中间件配置对比

```json
{
  "compareType": "middleware",
  "oldConfig": "{\"datasources\":{\"ds1\":{\"defaultDs\":\"a\"}}}",
  "newConfig": "{\"datasources\":{\"ds1\":{\"defaultDs\":\"b\"}}}",
  "appCode": "demo-app"
}
```

### 7.2 全局配置对比

```json
{
  "compareType": "global",
  "oldConfig": "{\"configGroupMap\":{}}",
  "newConfig": "{\"configGroupMap\":{\"g1\":{}}}",
  "appCode": "demo-app"
}
```

### 7.3 微服务配置对比

```json
{
  "compareType": "microservice",
  "oldConfig": "{\"moduleConfigMap\":{}}",
  "newConfig": "{\"moduleConfigMap\":{\"demo\":{}}}",
  "appCode": "demo-app"
}
```

## 8. 实现落点

- Controller：`iuap-yms-console/src/main/java/com/yonyou/iuap/yms/console/web/YMSConfigController.java`
- Service：`iuap-yms-console/src/main/java/com/yonyou/iuap/yms/console/service/YmsConfigCommonService.java`
- ServiceImpl：`iuap-yms-console/src/main/java/com/yonyou/iuap/yms/console/service/impl/YmsConfigCommonServiceImpl.java`
- Compare 引擎：`iuap-yms-console-sdk/src/main/java/com/yonyou/iuap/yms/console/sdk/utils/diff/YmsConfigCompareUtil.java`
- 规则文件：`iuap-yms-console-sdk/src/main/resources/config-compare-ignore-rules.json`