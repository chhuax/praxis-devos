# 我给 AI 编码助手套了一层"项目规范"，效果比预期好很多

用 AI 写代码差不多大半年了，从 Cursor 到 Claude Code 再到 OpenCode，主流工具基本都摸过一遍。

效率确实提上来了，但随之而来的问题也越来越明显，尤其是最近接手一个老项目改造的时候，差点被 AI 坑惨了。

## 事情的起因

我们有一个商品管理模块，产品经理提了个需求：支持 Excel 批量导入商品，导入时要校验数据格式，校验不通过的行要汇总返回给前端，让用户修改后重新上传。

需求不算复杂，但涉及的东西不少：文件上传、Excel 解析、逐行校验（SKU 不能重复、价格不能为负、分类必须存在）、批量入库、错误行汇总。而且这个项目是三年前写的老代码，Controller 层有一堆 try-catch，Service 层有的用构造器注入有的用字段注入，命名也是中英文混着来。

我跟 AI 说了需求之后，它直接开干了。十分钟不到，啪啪啪给我生成了一个 `ImportController`、一个 `ImportService`、一个 `ExcelParser` 工具类。

看着挺像回事，但我仔细一看：

- 它用了 `@Autowired` 字段注入，但这个模块旁边三个 Service 全是构造器注入
- 异常处理直接在 Controller 里 try-catch 返回了个 `Map<String, Object>`，但我们项目有统一的 `Result<T>` 封装和全局异常拦截器
- 校验逻辑全写在 Service 里一个 200 行的大方法中，没有拆分，也没有写任何测试
- 它把 `BigDecimal` 的价格比较用了 `==`，这个坑 Java 程序员都知道

我花了大半天去改它生成的代码。改完之后想，这跟我自己写有啥区别？还多了个"审查 AI 代码"的步骤。

## 同事推荐了个框架

后来组内另一个同事说他在用一个叫 praxis-devos 的东西，说是能"给 AI 立规矩"。

我一开始没当回事。又是什么框架，多半是个花架子。但看到他用 AI 写的代码风格跟手写的几乎一样整齐，我就有点好奇了。

花了一个周末研究了一下，发现这东西的思路挺对的。它不是在 AI 的"能力"上做文章，而是在 AI 的"工作流程"上做文章。

简单说就是三层：

| 层 | 管什么 | 怎么实现的 |
|---|---|---|
| OpenSpec 规范工作流 | 做什么？需求想清楚了吗？ | 提案 → 设计 → 规范场景 → 验证 |
| 可插拔技术栈 | 按什么标准做？ | 编码规范 + 领域 Skills |
| SuperPowers 执行质量 | 怎么做？质量有保障吗？ | 强制 TDD、系统化调试、完成前验证 |

下面我用同样的"批量导入商品"需求，展示一下接入这个框架之后 AI 是怎么工作的。

## 安装过程

```bash
git clone https://gitee.com/CodeGrok/praxis-devos.git
./praxis-devos/install.sh --stack java-spring --dir ./my-project
```

跑了大概 30 秒。它在项目里多了几个东西：一个 `AGENTS.md`（相当于 AI 的入职手册），一个 `openspec/` 目录（管需求和规范），一套 `.claude/skills/`（AI 能读到的技能包），以及一份 `stacks/java-spring/rules.md`（Java 编码规范）。

然后我在 `openspec/project.md` 里简单写了项目背景：Spring Boot 2.7、Maven、MySQL、商品管理系统。

## 阶段一：Propose（提案）——"先想清楚再动手"

我告诉 AI：

> 实现商品 Excel 批量导入功能，导入时校验数据，校验失败的行汇总返回

以前 AI 会直接开始写 Controller。但现在 AGENTS.md 里有"意图门控"：新功能 → 必须先写提案。

AI 在 `openspec/changes/batch-import-products/` 下创建了三个文件：

**proposal.md（提案）：**

```markdown
# 变更提案：商品批量导入

## 动机
运营团队每周需要批量更新 200-500 条商品信息，目前只能逐条录入。
需要支持 Excel 上传批量导入，并在导入失败时给出明确的错误反馈。

## 影响范围
- 新增：ImportController, ProductImportService, ExcelProductParser
- 修改：无（不改动现有代码）
- 依赖：Apache POI（Excel 解析）

## 风险评估
- Excel 文件可能很大（>10MB），需要限制文件大小和行数
- SKU 查重需要批量查询，避免 N+1
```

**design.md（技术设计）：**

```markdown
# 技术设计

## 整体流程
1. 前端上传 Excel 文件（限制 10MB、最多 1000 行）
2. 后端解析 Excel，逐行构建 ProductImportDTO
3. 校验每行数据：SKU 格式、价格 > 0、分类 ID 存在、SKU 不重复
4. 校验通过的行批量插入数据库（分批 100 条/次）
5. 校验失败的行汇总为 List<ImportError>，返回给前端

## 关键决策
- 使用 Apache POI 解析 Excel（项目已有依赖）
- 同步处理（单次最多 1000 行，无需异步队列）
- SKU 查重：一次性查询数据库中已有 SKU 集合，内存比对
- 分类校验：一次性查询所有分类 ID 缓存到 Set，避免逐行查库

## 错误处理
- 文件格式错误（非 xlsx）→ 400，"请上传 xlsx 格式文件"
- 文件过大 → 400，"文件不能超过 10MB"
- 部分行校验失败 → 200，返回成功数 + 失败行列表
- 全部失败 → 200，返回 0 成功 + 全部失败行列表
```

**spec.md（验收场景）：**

```markdown
#### Scenario: 全部校验通过，批量导入成功
Given Excel 包含 3 条商品记录，SKU 均不存在，价格均大于 0，分类 ID 均有效
When POST /api/v1/products/import 上传该文件
Then 返回 200，successCount=3，errors 为空数组
And 数据库 product 表新增 3 条记录

#### Scenario: 部分行校验失败
Given Excel 包含 5 条记录，其中第 2 行 SKU 已存在，第 4 行价格为 -10
When POST /api/v1/products/import
Then 返回 200，successCount=3，errors 包含 2 条记录
And errors[0].row=2, errors[0].reason="SKU 'SP-001' 已存在"
And errors[1].row=4, errors[1].reason="价格不能为负数"
And 数据库只新增了第 1、3、5 行的商品

#### Scenario: 文件格式不合法
Given 上传了一个 .csv 文件
When POST /api/v1/products/import
Then 返回 400，message="请上传 xlsx 格式文件"

#### Scenario: 文件超过大小限制
Given 上传了一个 15MB 的 xlsx
When POST /api/v1/products/import
Then 返回 400，message="文件不能超过 10MB"

#### Scenario: Excel 为空
Given 上传的 xlsx 文件没有数据行（只有表头）
When POST /api/v1/products/import
Then 返回 400，message="文件中没有可导入的数据"
```

除了这三个文件，AI 还生成了一份 **tasks.md（实现任务清单）**：

```markdown
# 实现任务

## 基础设施
- [ ] 添加 Apache POI 依赖到 pom.xml
- [ ] 创建 ProductImportDTO、ImportError 数据类

## 核心实现
- [ ] 实现 ExcelProductParser：解析 xlsx → List<ProductImportDTO>
- [ ] 实现校验逻辑：validateFormat() + validateBusinessRules() + checkDuplicateSku()
- [ ] 实现 ProductImportService.importProducts()：校验 → 分批入库 → 返回结果
- [ ] 实现 ImportController：文件大小/格式校验 + 调用 Service

## 测试
- [ ] 编写 5 个集成测试，覆盖 spec.md 中的全部场景
- [ ] 编写 ExcelProductParser 单元测试

## 收尾
- [ ] 运行全量测试，确认无回归
- [ ] openspec validate 验证场景覆盖
```

这份任务清单就是 AI 实现阶段的 TODO。每完成一项就打个勾，最后要求全部 `[x]` 才能进入验收环节。

说实话看到这些文件的时候我是有点意外的。尤其是 design.md 里"SKU 查重一次性批量查"和"分类 ID 缓存到 Set"这两个决策，如果 AI 没有事先想清楚，大概率会写出逐行查库的 N+1 代码。

我看了一遍，改了一个小细节（把文件大小限制从 10MB 改成 5MB，我们的服务器配置一般），跟 AI 说"方案确认"。

**这就是 OpenSpec 第一阶段的价值：AI 不再是拿到需求就开写，而是先输出一份你能审核的方案。需求、设计、验收标准，白纸黑字摆在那里。**

## 阶段二：Apply（实现）——"按规矩写代码"

方案确认后，AI 开始写代码。但跟之前直接一坨全吐出来不同，它按照 spec.md 里的场景逐个实现，而且是先写测试：

```java
@Test
@DisplayName("部分行校验失败时，只导入合法行，返回错误明细")
void should_import_valid_rows_and_return_errors_for_invalid() {
    // Given: 准备一个包含 5 行数据的 Excel（第 2 行 SKU 重复，第 4 行价格为负）
    productRepository.save(buildProduct("SP-001"));  // 预置 SKU
    MockMultipartFile file = buildExcelFile(
        row("SP-002", "商品A", "29.90", "1001"),  // 合法
        row("SP-001", "商品B", "39.90", "1001"),  // SKU 已存在
        row("SP-003", "商品C", "49.90", "1002"),  // 合法
        row("SP-004", "商品D", "-10",   "1001"),  // 价格为负
        row("SP-005", "商品E", "19.90", "1003")   // 合法
    );

    // When
    var result = mockMvc.perform(multipart("/api/v1/products/import").file(file))
        .andExpect(status().isOk())
        .andReturn();

    // Then
    var body = parseResult(result);
    assertThat(body.getSuccessCount()).isEqualTo(3);
    assertThat(body.getErrors()).hasSize(2);
    assertThat(body.getErrors().get(0).getRow()).isEqualTo(2);
    assertThat(body.getErrors().get(0).getReason()).contains("SP-001");
    assertThat(productRepository.count()).isEqualTo(4);  // 1 条预置 + 3 条新增
}
```

先跑测试，红了。然后 AI 才去写 Service 和 Controller 的实现。

而且写的过程中，它确实遵守了 `java-spring` 栈的规范：

- **构造器注入**：`private final ProductImportService importService;` 通过构造器传入，不是 `@Autowired`
- **统一异常处理**：文件格式错误和大小超限抛 `BusinessException`，由全局 `@RestControllerAdvice` 拦截返回 `Result<T>`
- **BigDecimal 比较**：`price.compareTo(BigDecimal.ZERO) <= 0` 而不是用 `==`
- **批量操作**：SKU 去重用 `SELECT sku FROM product WHERE sku IN (?)` 一次查出来，不是逐行查
- **审计字段**：自动带上 `createdAt`、`updatedAt`

测试跑通之后，AI 还重构了一下代码：把 200 行的校验逻辑拆成了 `validateFormat()`、`validateBusinessRules()`、`checkDuplicateSku()` 三个方法。

**对比一下之前没有框架时 AI 生成的代码：字段注入、Controller 里 try-catch、BigDecimal 用 ==、逐行查库。差距真的很大。**

## 阶段三：验收——"实现和方案对得上吗？"

代码写完后，AI 触发了 `code-review` 技能做自审：

```
✅ 正确性：5 个 spec 场景均有对应测试和实现
✅ 安全性：文件大小限制、格式校验、SQL 参数化
✅ 性能：SKU 批量查询而非逐行、分批 100 条入库
✅ 测试覆盖：核心 Service 方法 85% 覆盖
✅ 边界条件：空文件、超大文件、全部失败、部分失败
```

最后跑了一遍 `openspec validate`，确认代码实现覆盖了 spec.md 里的所有场景。验证通过后，这个变更就可以归档了。

**整个流程：Propose（提案+设计+场景定义）→ Apply（TDD 实现+规范约束）→ 验收归档。**

## 用了两周后的真实感受

先说好的：

1. **AI 写的代码风格终于统一了。** 因为有 `rules.md` 约束，不管开几个对话窗口，生成的代码都是一个味道。

2. **需求不会做歪。** 以前 AI 经常自行发挥，加一些你没要求的功能。现在有 spec.md 框着它，多一个少一个都会被 `openspec validate` 抓出来。

3. **review 的时间少了很多。** 以前要花大半天检查 AI 的代码，现在主要精力花在审 proposal 和 design 上（这些是文字，比审代码快多了），代码层面的规范问题框架帮你管了。

再说不太好的：

1. **有学习成本。** AGENTS.md 的决策树、OpenSpec 的三阶段、技术栈的 skill 路由，这些概念第一次接触需要花点时间消化。
2. **简单任务会觉得重。** 如果只是改个按钮文案、修个拼写错误，走一遍提案流程确实多余。不过框架本身有"意图门控"，小改动会跳过提案直接实现。
3. **技术栈 skill 要自己写。** 框架自带了 `java-spring`，但如果你用 Go 或 Python，得自己建一套栈。不过 `stacks/starter/` 模板复制过来改改也不难。

## 几个设计上值得一提的点

**技术栈可插拔**：切换技术栈只是换一套 `rules.md` 和 `skills/`，通用的工作流（提案、Git、代码评审）不受影响。

**私有栈**：公司内部规范不想开源？在 `stacks/` 下建个目录，加入自己的公司规范就行。正常安装使用。

## 总结

这个框架的核心思路很简单：**与其每次在对话框里反复叮嘱 AI "记得写测试、记得构造器注入、记得统一返回格式"，不如把这些规矩写成项目文件，让 AI 自己去读。**

如果你也在团队里用 AI 辅助开发，又受够了生成代码风格不统一的问题，可以试试。

**项目地址**：[gitee.com/CodeGrok/praxis-devos](https://gitee.com/CodeGrok/praxis-devos)

安装就两行：
```bash
git clone https://gitee.com/CodeGrok/praxis-devos.git
./praxis-devos/install.sh --stack java-spring --dir ./my-project
```
