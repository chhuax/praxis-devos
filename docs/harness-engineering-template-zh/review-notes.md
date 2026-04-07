# 对 `docs/harness-engineering-template-zh` 文档契约的第二轮评审意见

## 总体判断

这次修改是有效的。

相比上一版，这套模板已经从“信息架构合理的文档骨架”，明显进化到了“带治理规则的文档契约模板”。方向基本正确，而且核心短板已经补上了大半。

目前我的判断是：

- 作为模板：已经足够成熟
- 作为治理规范：已经具备落地基础
- 作为自动化契约系统：还差最后一步结构化执行规则

---

## 这次补得比较到位的地方

### 1. `AGENTS.md` 的边界明显收紧了

这一版把 `AGENTS.md` 收回到了“导航 + 最小协作约束”的范围内。

尤其这里处理得不错：

- `docs/harness-engineering-template-zh/AGENTS.md:27`
- `docs/harness-engineering-template-zh/AGENTS.md:31`

它已经明确把详细规则外链到：

- `docs/guides/contributing.md`
- `docs/definition-of-done.md`
- `docs/checks.md`

这说明模板已经开始把：

- 导航入口
- 协作规则
- 完成定义
- 校验规则

分开放置，而不是继续把所有治理信息塞进一个文件里。

这是对的。

### 2. `reference/` 的边界已经明确了

这一点在：

- `docs/harness-engineering-template-zh/docs/README.md:21`

已经写得比较清楚。

现在模板明确规定：

允许：

- 对契约信息做重排
- 做直接相关的解释性说明
- 记录契约相关兼容性备注

不允许：

- 实现细节
- 教程步骤
- 运维动作
- 与契约无关的背景知识

这是一个很关键的补丁。

因为 `reference/` 最容易在长期维护中失控，最后变成“半教程、半实现笔记、半运维手册”的混合体。现在把边界写出来后，reference 的漂移风险会小很多。

### 3. runbook 已经从抽象 checklist 走向可执行模板

这一版在两个地方做了补强：

- `docs/harness-engineering-template-zh/docs/README.md:36`
- `docs/harness-engineering-template-zh/docs/runbooks/api-failure-template.md:6`

新增内容包括：

- 触发阈值
- 观测入口
- 诊断命令
- 回滚条件
- 回滚步骤
- 升级条件
- 事后补充

这比上一版只有“检查步骤”要强很多。

至少现在模板表达的是：runbook 不是用来解释原理的，而是用来指导值班和恢复操作的。

### 4. DoD 已经补齐，而且拆分粒度合适

`docs/harness-engineering-template-zh/docs/definition-of-done.md:8` 开始的内容是这次最重要的改进之一。

它已经按变更类型拆出了完成定义：

- 改公共 API
- 改配置
- 改权限
- 改错误模型
- 改运维流程
- 改关键设计决策

而且不是泛泛地说“记得同步文档”，而是写成了明确的“必须满足”。

这意味着：

- reviewer 有依据
- agent 有依据
- CI 后续也有依据

这已经不再是软约定，而是接近“交付门槛”。

### 5. `checks.md` 已经把校验项显式写出来了

`docs/harness-engineering-template-zh/docs/checks.md:6` 开始，已经形成了一组比较清楚的最小校验规则：

- 契约存在性校验
- reference 同步校验
- 占位符校验
- guide / migration 校验
- runbook 校验

这一步很关键。

因为上一版最大的问题之一，是规则只存在于口头描述里；而现在至少已经被写成了独立治理文档。

### 6. `catalog.yaml` 已经更接近“可执行映射”

相较之前只写 `triggers`，这一版在：

- `docs/harness-engineering-template-zh/docs/catalog.yaml:6`

补进了：

- `detect.contractPaths`
- `detect.sourcePaths`
- `changeKinds`
- `checks`

这说明它已经不只是“告诉人哪些文档相关”，而是在尝试表达：

- 哪些路径变化会影响哪个 contract
- 哪类改动触发哪类同步动作
- 哪些校验项应该被执行

虽然还不是最终机器格式，但已经踏实往前迈了一步。

### 7. 契约间关联已经显式化了

`docs/harness-engineering-template-zh/docs/catalog.yaml:78` 开始新增的 `links` 很有价值：

- API → errors
- API → permissions
- CLI → config

这一点我非常认可。

之前这些关联主要靠读者自己理解，现在至少已经开始形成统一关系层。后续不管是做一致性检查、影响分析还是自动生成说明，都会容易很多。

---

## 现在还剩下的主要问题

## 1. `checks.md` 仍然是“规则说明”，还不是“规则格式”

这是我认为当前最主要的剩余问题。

现在 `docs/checks.md` 已经写清楚了要检查什么，但它本质上仍然是给人看的文档，不是给程序消费的配置格式。

这意味着如果以后要接 CI，仍然需要再做一次翻译：

- 人先读 `checks.md`
- 再把内容改写成脚本逻辑

这会带来双维护问题。

### 建议

把“解释”和“执行”分开：

- `docs/checks.md`：说明规则为什么存在、什么时候适用
- `docs/checks.yaml` 或扩展 `docs/catalog.yaml`：给 CI / 脚本直接读取

例如：

```yaml
placeholderPatterns:
  - "<填写"
  - "<项目"
  - "example.com"
  - "TODO: replace"

requiredArtifacts:
  public-api:
    contract: contracts/openapi/public.yaml
    reference: docs/reference/api.md
    migrationWhen:
      - breaking-change
```

做到这一步后，这套模板才算真正接近“文档契约系统”。

---

## 2. `catalog.yaml` 的 `sourcePaths` 仍然带有较强项目假设

例如这里：

- `src/controllers/**`
- `src/api/**`
- `src/routes/**`
- `src/**/application*.yml`
- `src/**/application*.properties`

这些路径模式对于很多项目是合理的，但作为通用模板，会隐含某种项目结构偏好。

这不是大问题，但需要说清楚它是：

- 示例检测规则
- 不是模板消费者必须照搬的固定标准

### 建议

在 `README.md` 或 `catalog.yaml` 顶部加一句：

- `detect.sourcePaths` 为示例，需要按目标项目的技术栈和目录结构调整

否则别人会误以为这些路径也是契约的一部分。

---

## 3. `docs/` 下的治理文档已经出现，但结构说明还可以再显式一点

目前：

- `AGENTS.md` 已经把 `contributing.md`、`definition-of-done.md`、`checks.md` 视为关键入口

这是好的。

但 `docs/README.md` 的结构说明目前还是偏目录类别式：

- `reference/`
- `guides/`
- `runbooks/`
- `adr/`
- `catalog.yaml`

还没有明确把下面这些治理文档标成“正式组成部分”：

- `definition-of-done.md`
- `checks.md`

### 建议

在 `docs/README.md` 里补一个“治理文档”小节，例如：

- `definition-of-done.md`：定义文档与契约何时算完成
- `checks.md`：定义最小校验规则
- `catalog.yaml`：定义文档影响映射和契约关联

这样整个体系会更完整，不像是后续临时加上的补丁。

---

## 4. runbook 还差“责任分界”这一层

`docs/runbooks/api-failure-template.md` 现在已经有：

- 升级条件
- 回滚条件
- 回滚步骤

这很好。

但在真实值班场景里，还常常需要一个更明确的问题：

- 谁可以直接回滚？
- 谁只能升级，不能操作？
- 哪些情况必须同步通知依赖方？

现在模板还没有这层表达。

### 建议

可以考虑新增一节：

```md
## 责任分界

- 当值班工程师可确认问题由本服务最新变更导致时，可执行预定义回滚
- 涉及数据库、权限模型或跨团队依赖时，必须升级给负责人
- 涉及公共契约破坏时，必须通知调用方团队
```

这样 runbook 会更贴近真实值班动作，而不是只有步骤没有权限边界。

---

## 5. 占位符校验与模板自身的关系还需要一句说明

现在模板自己保留了很多占位符，比如：

- `<填写测试命令>`
- `<填写错误率阈值>`
- `<填写接口探测命令>`

而 `docs/checks.md` 又规定正式项目中不能保留这些占位符。

逻辑上没问题，但最好显式写一句：

- 模板仓库允许保留占位符
- 落地项目启用校验后必须替换

否则容易让读者困惑：模板自身是不是永远无法通过校验？

---

## 现在的整体评价

如果上一版是“方向正确的文档治理骨架”，那么这一版已经可以算：

**带治理规则、带完成定义、带关系表达的文档契约模板。**

它已经具备了下面几个关键特征：

- 目录职责分层清楚
- 事实源明确
- 参考文档边界明确
- 完成定义明确
- 校验项明确
- 契约关系开始显式化

这说明它已经不只是一个写文档的目录模板，而是开始具备“约束开发行为”的能力。

剩下的问题主要不是方向问题，而是最后一层“结构化执行”问题。

---

## 建议的下一步优先级

### P1：把规则再结构化一步

优先把以下内容整理成机器可消费格式：

- 占位符校验规则
- 各类变更所需文档产物
- migration / guide / runbook 的触发条件

### P2：给模板的“示例假设”补说明

重点说明：

- `sourcePaths` 是示例
- 占位符允许存在于模板，不允许残留在落地项目

### P3：增强 runbook 的责任边界

新增：

- 谁能执行回滚
- 谁需要被通知
- 哪些场景必须升级

---

## 一句话结论

这次 Codex 的修改是有效的，而且基本补上了我上一轮提出的大部分核心问题。

现在这套模板已经不只是“文档结构建议”，而是“接近可落地的文档契约模板”；接下来最值得做的，是把 `checks.md` 里的规则进一步转成机器可执行格式。
