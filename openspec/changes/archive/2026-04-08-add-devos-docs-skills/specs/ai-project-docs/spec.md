## 新增需求

### 需求：仓库内验收必须聚焦 contract、writeback、validation 和 compatibility

仓库必须定义并测试 AI-first 文档能力的 contract、writeback 规则、deterministic validation 与 compatibility 行为；宿主 command 适配层的接线由后续集成层验证。

#### 场景：仓库范围内的验收不要求宿主适配层落地
- **当** 这个 change 在当前仓库中实现时
- **则** 仓库内验收覆盖 `devos-docs` skill contract、handoff contract、writeback 规则、deterministic validation 和 compatibility 行为
- **并且** 仓库内验收不要求 `/devos:docs-init` 或 `/devos:docs-refresh` 的完整宿主 command 适配层已经实现
- **并且** 宿主侧 command 接线由后续集成层单独验证

### 需求：文档编排必须支持由宿主 command 驱动的 AI-first 初始化

系统必须支持通过宿主 agent command 派发普通子 agent，并由该子 agent 执行 `devos-docs` skill 的 `mode=init` 来初始化项目文档。

#### 场景：为普通项目初始化文档
- **当** 宿主 command 为一个尚未存在文档 contract 产物的项目触发 docs initialization
- **则** 系统派发一个普通子 agent，并让其以 `mode=init` 执行 `devos-docs` skill
- **并且** 子 agent 收到足以识别主对外面和仓库核心地图的项目上下文
- **并且** 结果中包含 `contracts/surfaces.yaml` 和 `docs/codemaps/project-overview.md`

#### 场景：为 Maven 多模块项目初始化文档
- **当** 宿主 command 为一个 Maven 多模块项目触发 docs initialization
- **则** 系统派发一个普通子 agent，并让其以 `mode=init` 执行 `devos-docs` skill
- **并且** 结果中包含 `contracts/surfaces.yaml`
- **并且** 结果中包含 `docs/codemaps/project-overview.md`
- **并且** 结果中包含 `docs/codemaps/module-map.md`
- **并且** 对每个已发现模块，结果中都包含一个 `docs/codemaps/modules/<artifactId>.md`

#### 场景：根 `pom.xml` 没有 `<modules>` 时按单模块处理
- **当** 仓库根目录存在 `pom.xml`
- **并且** 根 `pom.xml` 没有声明非空的 `<modules>` 列表
- **则** 当前阶段的 Maven 检测将该项目视为单模块项目
- **并且** `docs/codemaps/module-map.md` 不是必需项
- **并且** `docs/codemaps/modules/<artifactId>.md` 也不是必需项

#### 场景：通过显式聚合递归发现嵌套 Maven 模块
- **当** 仓库根目录存在 `pom.xml`
- **并且** 某个已发现模块的 `pom.xml` 自身也声明了非空的 `<modules>` 列表
- **则** Maven 检测继续递归发现这些显式声明的子模块
- **并且** 只有通过显式 `<modules>` 声明可达的模块才算已发现模块
- **并且** 不能仅凭目录扫描就把未声明的兄弟目录或后代目录视为模块

### 需求：文档编排必须支持由宿主 command 驱动的 AI-first 刷新

系统必须支持通过宿主 agent command 派发普通子 agent，并由该子 agent 执行 `devos-docs` skill 的 `mode=refresh` 来刷新已有文档 contract。

#### 场景：项目变更后刷新文档
- **当** 宿主 command 为一个已经存在文档 contract 产物的项目触发 docs refresh
- **则** 系统派发一个普通子 agent，并让其以 `mode=refresh` 执行 `devos-docs` skill
- **并且** 子 agent 收到当前项目上下文和现有文档 contract 产物
- **并且** 返回结果只允许命中被允许的文档 contract 文件

#### 场景：刷新时保留 Maven 模块 codemap 覆盖面
- **当** docs refresh 运行在一个 Maven 多模块项目上
- **则** 刷新结果包含 `docs/codemaps/module-map.md`
- **并且** 对每个已发现模块，刷新结果都包含一个 `docs/codemaps/modules/<artifactId>.md`

#### 场景：模块 codemap 命名遵循已发现的 `artifactId`
- **当** Maven 多模块检测成功
- **则** 每个模块 codemap 路径都使用 `docs/codemaps/modules/<artifactId>.md` 这一模式
- **并且** `<artifactId>` 来源于已发现的模块元数据
- **并且** 使用未声明模块名或重复模块名的路径必须在 validation 中被拒绝

#### 场景：缺少 `artifactId` 时回退为规范化相对路径
- **当** 某个已发现模块的 `pom.xml` 缺少 `<artifactId>`
- **则** 模块 codemap 路径使用一个基于该模块相对仓库根目录规范化路径的稳定名称
- **并且** 如果这个回退名称与其他已发现模块名称冲突，validation 必须拒绝

### 需求：文档生成必须使用结构化输出 contract

系统必须通过结构化输出 contract 来消费文档生成结果，而不是允许子 agent 任意写仓库。

#### 场景：docs init 返回结构化结果
- **当** `devos-docs` skill 以 `mode=init` 执行完成
- **则** 它返回的结果中包含 `schemaVersion`
- **并且** 包含 `mode`
- **并且** 将 `surfacesYaml` 内容与 codemap 文件内容分开返回
- **并且** codemap 输出通过目标相对路径或显式 `path` 条目表达

#### 场景：允许写入目标集合是显式且封闭的
- **当** 仓库对 docs 生成结果做 validation
- **则** 当前阶段唯一合法的写入目标是：
- **并且** `contracts/surfaces.yaml`
- **并且** `docs/codemaps/project-overview.md`
- **并且** `docs/codemaps/module-map.md`
- **并且** `docs/codemaps/modules/<artifactId>.md`
- **并且** 除此之外的任何仓库路径都不是 Phase 2 结果 contract 的合法写入目标

#### 场景：主流程根据 contract 写回文件
- **当** 主流程收到 docs 生成结果
- **则** 主流程从结构化 contract 中写入 `contracts/surfaces.yaml`
- **并且** 只把 codemap 写到允许目标集合内
- **并且** 保留托管区块之外的用户自定义内容

#### 场景：refresh 不删除 codemap 文件
- **当** `devos-docs` skill 以 `mode=refresh` 执行完成
- **则** 返回 contract 只能使用非破坏性的写入动作
- **并且** 主流程不能仅凭 AI 结果删除 codemap 文件

#### 场景：结构化结果拒绝空内容或重复输出
- **当** docs 生成结果中的 `surfacesYaml` 为空
- **或** 包含重复的 codemap 路径
- **或** 某个 codemap 条目的内容为空
- **则** 该结果是 invalid
- **并且** 主流程不能静默写入这些输出

#### 场景：invalid contract 在写回前失败
- **当** contract validation 因 schema、mode、path 或 content 规则失败
- **则** 仓库写回流程不会开始
- **并且** 仓库不会被该结果部分写入

### 需求：文档 validation 必须保持 deterministic

系统必须在生成或刷新后，以机械方式验证文档 contract 产物。

#### 场景：validation 拒绝不完整的 surfaces contract
- **当** `contracts/surfaces.yaml` 缺少 `primary_surface` 或必填 surface 字段
- **则** validation 报告缺失字段

#### 场景：validation 拒绝空白的 surfaces contract
- **当** `contracts/surfaces.yaml` 存在但为空或仅包含空白字符
- **则** validation 将其判定为 invalid

#### 场景：validation 拒绝非法的 contract 元数据
- **当** docs 生成结果缺少 `schemaVersion`
- **或** `schemaVersion` 不是 `1`
- **或** 缺少 `mode`
- **或** `mode` 不是 `init` 或 `refresh`
- **则** validation 在写回前拒绝该 contract

#### 场景：validation 拒绝不完整的 codemap 输出
- **当** 某个必需的 codemap 文件缺失、为空，或包含未解析的占位符
- **则** validation 报告该问题，且不依赖另一轮模型调用

#### 场景：validation 拒绝重复的 codemap 目标路径
- **当** 生成结果中同一 codemap 路径出现多次
- **则** validation 将该重复路径判定为 invalid

#### 场景：validation 拒绝空白的 codemap 内容
- **当** 某个 codemap 路径合法，但其内容为空或只包含空白字符
- **则** validation 将该 codemap 判定为 invalid

#### 场景：validation 拒绝 allowlist 之外的写入目标
- **当** docs 生成结果指向 Phase 2 允许目标集合之外的任一路径
- **则** validation 在写回前拒绝该结果

#### 场景：validation 拒绝非 `upsert` 动作
- **当** 某个 codemap 条目缺少 `action`
- **或** `action` 不是 `upsert`
- **则** validation 在写回前拒绝该结果

#### 场景：validation 检测到冲突的 surfaces 路径
- **当** 仓库中同时存在 `contracts/surfaces.yaml` 和 `docs/surfaces.yaml`
- **则** validation 报告路径冲突

#### 场景：写回流程拒绝非 canonical 的 surfaces 路径
- **当** docs 生成结果试图写入 `docs/surfaces.yaml`
- **则** contract validation 在文件写回前拒绝该结果
- **并且** 仓库保持不变

#### 场景：refresh 只更新显式返回且已经通过 validation 的目标
- **当** `devos-docs` skill 以 `mode=refresh` 执行完成
- **则** 系统只更新 validated contract 中显式返回的文件
- **并且** 不得隐式删除、重命名或迁移 docs 产物

#### 场景：validation 强制执行 Maven 多模块 codemap 覆盖
- **当** Maven 多模块检测成功
- **则** validation 要求存在 `docs/codemaps/module-map.md`
- **并且** 对每个已发现模块都要求存在 `docs/codemaps/modules/<artifactId>.md`

#### 场景：compatibility path 遵守 canonical path 和 validation 规则
- **当** `praxis-devos docs init|refresh` 在兼容阶段运行
- **则** 它必须遵守与 AI-first 主路径相同的 canonical path、允许写入目标集合和 deterministic validation 规则
- **并且** 不得引入另一套独立的 writeback 协议

#### 场景：迁移保护阻止自动迁移 surfaces 路径
- **当** 这个 change 应用到一个已经存在 `contracts/surfaces.yaml` 的仓库
- **则** 系统不得自动把它移动、重命名或改写为 `docs/surfaces.yaml`
