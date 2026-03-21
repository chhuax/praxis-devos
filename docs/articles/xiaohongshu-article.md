# 终于让 AI 编码助手"守规矩"了｜开源框架真实体验

用 AI 写代码半年多了，踩了不少坑，最近找到个还不错的解法，分享给大家。

## 先说痛点

用 Claude Code / OpenCode 写代码，快是真的快，但坑也是真的多：

- 今天用构造器注入，明天就给你搞 @Autowired，旁边文件怎么写的它根本不看
- 让它加个新接口，它会顺手改掉某个公共工具类，结果别的模块直接炸了
- 不写测试、不写文档、异常处理乱来，生成的代码 review 起来比自己写还累

最惨的一次：让 AI 做商品批量导入功能，它把 BigDecimal 价格比较用了 `==`，SKU 查重写了个逐行查库的 N+1。能跑，但没法维护。

## 后来怎么解决的

同事推荐了一个叫 praxis-devos 的开源框架。核心思路：**把编码规范和开发流程写成文件，让 AI 自己去读。**

两行命令装好，AI 再接到需求之后，工作方式完全变了。

## 用同样的"批量导入"需求跑一遍

**第一步：AI 先出方案，不直接写代码**

框架内置了 OpenSpec 规范工作流。AI 识别到这是新功能后，自动创建了三份文档：

📄 **proposal.md** — 为什么做、改哪些模块、有什么风险

📐 **design.md** — 技术方案和关键决策。比如它提前想到了"SKU 去重一次性批量查，不逐行查库"和"分类 ID 缓存到 Set 内存比对"。如果没事先想清楚这些，大概率又会写出 N+1 的代码。

📋 **spec.md** — 用 Given-When-Then 写清楚 5 个验收场景：

📝 **tasks.md** — 实现任务清单，每完成一项打勾，全部 ✅ 才能进入验收：

```
Scenario: 部分行校验失败
Given Excel 有 5 行，第 2 行 SKU 重复，第 4 行价格为负
When 上传文件
Then 只导入合法的 3 行，返回失败行的具体原因
```

```
tasks.md:
- [ ] 添加 POI 依赖，创建 DTO
- [ ] 实现 Excel 解析器
- [ ] 实现校验逻辑（格式 + 业务规则 + SKU 去重）
- [ ] 实现 Service 和 Controller
- [ ] 编写 5 个集成测试覆盖全部场景
- [ ] openspec validate 验证
```

我看了一遍方案，改了个小细节，确认通过。

**第二步：TDD + 编码规范全程约束**

方案通过后 AI 按场景逐个实现，先写测试让它失败，再写实现让它通过。

同时 java-spring 栈的规范全程生效：
- ✅ 构造器注入（不准 @Autowired）
- ✅ BigDecimal 用 compareTo（不准 ==）
- ✅ 参数化 SQL，批量查询（不准逐行查库）
- ✅ 统一异常处理，审计字段自动带上

这些以前要在对话框里一遍遍提醒，现在写在 rules.md 里，AI 自己遵守。

**第三步：自审 + 验证**

代码写完后触发 code-review 自查 → 跑 openspec validate 确认实现覆盖了所有场景。对得上才算完。

## 用了两周的真实感受

👍 代码风格终于统一了，不管开几个对话窗口
👍 需求不会做歪，spec.md 框着 AI 不让它自由发挥
👍 review 时间从大半天降到一小时

👎 概念有点多，第一次上手需要消化
👎 目前只自带 java-spring 栈，Go/Python 要自己建
👎 简单改动会不会太重？（其实不会，小改动自动跳过提案）

## 设计上的几个亮点

📁 技术栈可插拔 — Java/Go/React 各用各的规范，流程不变
🔒 支持私有栈 — 企业内部规范加 .gitignore 就行
🧩 三层互补 —

| 层 | 管什么 | 没有会怎样 |
|---|---|---|
| OpenSpec | 需求想清楚了吗？ | AI 拿到需求直接写，做出来不是你想要的 |
| 技术栈 | 按什么标准写？ | 风格不统一，该踩的坑照踩 |
| SuperPowers | 执行质量有保障吗？ | AI 说"写完了"，实际没验证 |

---

**项目地址**：gitee.com/CodeGrok/praxis-devos

```bash
git clone https://gitee.com/CodeGrok/praxis-devos.git
./praxis-devos/install.sh --stack java-spring --dir ./my-project
```

说白了就一句：与其在对话框里反复叮嘱 AI 守规矩，不如把规矩写成文件让它自己读。

#AI编程 #开源项目 #ClaudeCode #OpenCode #程序员效率 #开发框架 #规范驱动开发

<!-- 建议配图：
图1: 安装后的项目目录结构（AGENTS.md + openspec/ + skills/ + stacks/）
图2: proposal.md + design.md + spec.md 三个文件截图（方案阶段产物）
图3: 终端截图：测试先红后绿的 TDD 流程
图4: java-spring/rules.md 编码规范截图
图5: openspec validate 通过的截图
图6: 有框架 vs 无框架 对比图
-->
