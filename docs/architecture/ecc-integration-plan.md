# Praxis DevOS × ECC 集成方案

## 目标

把 `praxis-devos` 从“ECC-oriented placeholder”推进到“真正依赖并接入 ECC 能力”的产品形态。

核心原则：

- **Praxis DevOS 不是重做 ECC**
- **ECC 是底层能力源，Praxis 是项目接入层/产品壳**
- **OpenSpec 是治理层，不取代 ECC，也不取代 Praxis**
- **先接最小可用能力，不装 ECC 全家桶**

---

## 三层分工

### 1. Praxis DevOS
负责：

- `setup / init / status / doctor`
- `.praxis/manifest.json`
- foundation / profile / overlays
- stack / skill / agent workflow 编排
- OpenSpec 治理衔接
- 项目级 ECC binding 管理

### 2. ECC
负责：

- runtime / distro 基础能力
- commands
- hooks
- skills
- MCP
- rules / runtime policy

### 3. OpenSpec
负责：

- proposal / spec / validation / archive
- 受控变更治理
- 不是日常实现的唯一入口

---

## 架构图

```text
Developer / Agent
      |
      v
+------------------------+
| Praxis DevOS CLI       |
| setup/init/status      |
| doctor/change/...      |
+------------------------+
      |
      v
+------------------------+
| .praxis project layer  |
| manifest               |
| foundation/profile     |
| overlays               |
| stack/skills wiring    |
+------------------------+
      |
      v
+------------------------+
| ECC binding layer      |
| detect/bind runtime    |
| commands/hooks adapter |
| skills/MCP adapter     |
+------------------------+
      |
      v
+------------------------+
| ECC runtime/capability |
| commands/hooks         |
| skills/MCP/rules       |
+------------------------+

Parallel governance path:
OpenSpec -> proposal / validation / archive
```

---

## 第一阶段到底做了什么

第一阶段不是接真实 ECC 实现，而是先把 **承载 ECC 的产品骨架** 搭起来：

- 内置 `ecc-foundation`
- 内置 `internal-base profile`
- 内置 `ecc-runtime-base overlay`
- 内置 `internal-extension-points`
- 让 `setup/init/status/use-foundation` 能围绕 ECC foundation 工作
- 让 OpenSpec 退到 `optional-governance`
- 打通 docs / conventions / install / project manifest

一句话：

> 第一阶段先把“Praxis 怎么承载 ECC”做出来。

---

## 第二阶段是什么

第二阶段才开始把 ECC 当成 **真实依赖面**。

不是重做 ECC，而是：

- 检测 ECC
- 绑定 ECC
- 记录 ECC binding
- 暴露 ECC 状态
- 把 ECC commands/hooks/skills/MCP 接入到 Praxis 项目层

---

## 当前进度

### 已完成：第二阶段第一刀

已落地：`71da221 detect ECC runtime binding state`

当前已经支持：

- 检测 `PRAXIS_ECC_RUNTIME`
- 检测 `ECC_RUNTIME_DIR`
- 检测 `ECC_HOME`
- 检测 `ecc` 是否在 `PATH`
- 将 ECC binding state 写入 `.praxis/manifest.json`
- 在 `status`
- 在 `doctor`
- 在 foundation README

这意味着 ECC 不再只是个占位名词，而是开始变成真实依赖。

---

## ECC 到底要不要全装

**不要。**

推荐策略：**最小安装 + 按需接入**。

### 第一批只需要

- ECC runtime 基础部分
- 可被 `ecc` 命令识别的 CLI / runtime root
- 与当前项目接入相关的最小 commands/hooks/skills 能力

### 暂时不要

- 全量语言包
- 全量 hooks
- 全量 MCP
- 全量 skills
- 企业版能力
- 组织级安全治理全家桶

原因：

- 复杂度太高
- 用户理解成本高
- 容易把 `praxis-devos` 变成 ECC 的镜像壳
- 不利于产品边界收敛

---

## 企业版怎么处理

当前阶段：**先不碰企业版**。

原因：

- 当前核心问题还是基础 binding / adapter / project wiring
- 企业版更多是组织级治理、私有扫描、App 集成、安全能力
- 在基础接入没跑顺前引入 enterprise，只会让问题变复杂

建议顺序：

1. 先跑通基础 ECC runtime binding
2. 再接 commands/hooks/skills/MCP
3. 真出现团队级治理需求，再评估 enterprise

---

## 我们应该怎么用 ECC

正确方式不是：

- 把 ECC 打散重做进 `praxis-devos`
- 或要求用户一开始把 ECC 全家桶全装上

正确方式是：

1. **先安装或提供 ECC runtime**
2. **Praxis 显式绑定 ECC**
3. **项目 manifest 记录绑定状态**
4. **status/doctor 给出状态和修复路径**
5. **再把 ECC 的 commands/hooks/skills/MCP 分批接进来**

---

## 第二阶段建议拆分

### Phase 2.1 - ECC detect/bind

目标：

- 显式 `bind` 流程
- 项目级记录 ECC 路径/来源
- 不再只靠环境变量猜测

建议命令：

```bash
npx praxis-devos bind /path/to/ecc
# 或
npx praxis-devos bind --ecc /path/to/ecc
```

执行后：

- 写入 `.praxis` 项目级配置
- 刷新 manifest
- 刷新 `status`
- 刷新 `doctor`

### Phase 2.2 - ECC remediation flow

目标：

- `doctor` 能明确告诉用户怎么修
- `status` 能看见当前绑定来源
- setup/init 能给出更合理提示

### Phase 2.3 - ECC commands/hooks adapter

目标：

- 把最小一批 ECC commands 映射到 Praxis 项目里
- 把 hooks 接进项目工作流节点

### Phase 2.4 - ECC skills/MCP adapter

目标：

- 让 `.praxis` 能引用 ECC 的 skills/MCP
- 实现项目级启用/禁用和可见性

---

## 当前推荐路线

### 现在优先做

1. **项目级 ECC bind 命令**
2. **manifest 里的 ECC binding 配置持久化**
3. **doctor/status 的 remediation flow**
4. **最小 commands/hooks adapter**

### 现在不要做

1. ECC 全量能力内嵌
2. 企业版接入
3. 全家桶安装
4. 大而全的 MCP / hooks / skills 全覆盖

---

## 一句话总结

> ECC 是底盘，Praxis 是车身，OpenSpec 是治理层。
>
> 第一阶段把车身焊好了；第二阶段开始把车身真正装到底盘上。
>
> 现在不该全装 ECC，更不该重写 ECC；应该先把 ECC runtime 的安装/绑定/状态/修复链路做通，再按需接 commands/hooks/skills/MCP。
