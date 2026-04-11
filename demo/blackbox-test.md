# add-config-compare-api 黑盒测试说明

## 1. 测试目标

验证统一配置对比接口能够按提案要求完成以下能力：

- 基于 `compareType` 对中间件、全局、微服务配置进行差异对比
- 返回稳定的 `List<YmsConfigDiff>` 结果结构
- 对非法 `compareType` 和非法 JSON 请求进行拒绝
- 按忽略规则屏蔽 `_meta`、`_itemDesc` 以及指定噪音字段带来的 diff
- 保持现有 keyed-list 和深度比较语义

## 2. 测试范围

- 接口入口：`POST /config-service/web/v3/config/compare`
- 对比类型：`middleware`、`global`、`microservice`
- 规则文件：`iuap-yms-console-sdk/src/main/resources/config-compare-ignore-rules.json`
- 基准样例：
    - `iuap-yms-console-sdk/src/test/resources/compare/yms_middleware.json`
    - `iuap-yms-console-sdk/src/test/resources/compare/yonbip_config.json`
    - `iuap-yms-console-sdk/src/test/resources/compare/module_config.json`

## 3. 前置条件

- 服务已部署，且 `/config-service/web/v3/config/compare` 可访问
- 请求账号具备配置只读权限
- 测试环境已准备可直接提交的 JSON 文本
- 默认使用 UTF-8 编码

## 4. 请求约束

请求体字段：

- `compareType`：必填，支持 `middleware`、`global`、`microservice`
- `oldConfig`：可空，旧配置 JSON 文本
- `newConfig`：可空，新配置 JSON 文本
- `appCode`：必填，应用编码
- `configApp`：可空，配置应用名；为空时按 compareType 使用默认值

## 5. 核心黑盒场景

### 5.1 中间件配置对比成功

- 输入：`compareType=middleware`，提交两份仅在业务字段上存在差异的中间件配置
- 期望：
    - 返回成功响应
    - `data` 为 `List<YmsConfigDiff>`
    - 能识别新增、删除、更新三类变更
    - 忽略 `lastUpdateTime`、`createUserId`、`createUser`、`createTime`、`updateUserId`、`updateUser`、`updateTime`、
      `combinedSwitch`、`exclusiveValue`、`exclusiveSwitch`、`exclusiveUpdateSwitch`、`exclusiveRouteSwitch`、
      `exclusiveDefaultSchema`、`name`、`attribute`、`tag`
    - `_meta`、`_itemDesc` 子树不产生 diff

### 5.2 全局配置对比成功

- 输入：`compareType=global`，提交两份全局配置 JSON
- 期望：
    - 返回成功响应
    - 业务配置项差异被正确输出
    - `_itemDesc` 和审计字段变化不产生 diff

### 5.3 微服务配置对比成功

- 输入：`compareType=microservice`，提交两份模块配置 JSON
- 期望：
    - 返回成功响应
    - 模块下配置组、配置项增删改可被识别
    - `componentClients` 等已配置场景专属忽略路径不产生 diff
    - `_meta`、`_itemDesc` 和审计字段变化不产生 diff

### 5.4 顶层对象新增

- 输入：新配置比旧配置多一个顶层配置对象
- 期望：对应 diff 操作为 `add`

### 5.5 顶层对象删除

- 输入：旧配置比新配置多一个顶层配置对象
- 期望：对应 diff 操作为 `delete`

### 5.6 keyed-list 行为保持稳定

- 输入：中间件日志配置 `logger` 列表中，同名项属性变化但顺序变化
- 期望：
    - 按逻辑项名称识别更新
    - 不因列表顺序变化产生额外误报

### 5.7 非法 compareType

- 输入：`compareType=unknown`
- 期望：
    - 请求被拒绝
    - 返回参数错误类异常
    - 不返回部分 diff 数据

### 5.8 非法 JSON

- 输入：`oldConfig` 或 `newConfig` 为不合法 JSON
- 期望：
    - 请求被拒绝
    - 返回参数错误类异常
    - 不进入 compare 结果生成流程

### 5.9 空旧配置或空新配置

- 输入：`oldConfig` 为空字符串或 `newConfig` 为空字符串
- 期望：
    - 接口仍可处理
    - 整体新增或整体删除场景可正常输出 diff

### 5.10 忽略规则回归验证

- 输入：仅修改 `_meta`、`_itemDesc`、`tags`、`name`、`tag`、`attribute`、`exclusiveSwitch` 等被忽略字段
- 期望：返回 diff 为空或不包含这些路径对应项

## 6. 建议测试数据组织

- 基准文件直接复用 `compare` 目录中的 JSON 样例
- 每类场景保留一份“仅改业务字段”的变体
- 每类场景保留一份“仅改忽略字段”的变体
- keyed-list 场景单独准备日志配置变体

## 7. 通过标准

- 三类 compareType 成功场景均可返回稳定 diff
- 非法请求均被确定性拒绝
- 忽略规则命中路径不出现在结果中
- 关键业务字段差异不会被误忽略
- keyed-list、顶层 add/delete、深度比较行为与既有 compare 语义一致

## 8. 回归重点

- 历史对比、预览对比复用新 service 路径后结果不漂移
- 规则文件调整后，非目标路径不会被误忽略
- compareType 默认 `configApp` 取值仍符合原有行为