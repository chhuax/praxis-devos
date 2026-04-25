## 1. 定义 change 合同

- [x] 1.1 新增 OpenSpec proposal / design / spec，明确外部 pack 由 Praxis 统一投放，并按资源类型扩展
- [x] 1.2 约定项目级配置格式、git URL 支持方式与第一版支持的扩展包目录布局

## 2. 实现外部 pack resource source 发现

> blocked-by: 1

- [x] 2.1 在 `src/projection/` 中实现项目级 `package.json["praxis-devos"].skillPacks` 读取
- [x] 2.2 支持 `skills/*`、`commands/*` 与对应的 `common + stacks` 两类布局
- [x] 2.3 对缺失路径、非法布局和技能名冲突做确定性校验

## 3. 接入统一投放链路与 CLI 命令

> blocked-by: 2

- [x] 3.1 让 `projectToAgent()` 与 projection health 计算纳入外部 skill packs
- [x] 3.1.1 抽出独立 projection service，统一承接框架内置投放与扩展包投放
- [x] 3.1.2 按资源类型拆分投放器，当前至少独立出 `skills` 与 `commands`
- [x] 3.2 保持现有 marker、managed-assets 和 stale cleanup 逻辑可用于外部 skills
- [x] 3.3 确保 `doctor` 对配置错误给出诊断，而不是直接崩溃
- [x] 3.4 新增 `install-pack <path-or-git-url> --stack <name>` 命令，直接触发用户级投放
- [x] 3.5 对 `common + stacks` 布局的显式安装命令要求至少一个 `--stack`
- [x] 3.6 为 `install-pack` 使用 pack 级 owner 作用域，重复安装时只清理该 pack 上一版已移除的资源

## 4. 测试与文档

> blocked-by: 3

- [x] 4.1 为外部 skill pack 投放、support files 复制、冲突检测补测试
- [x] 4.2 为 `doctor` 的外部 pack 配置错误诊断补测试
- [x] 4.3 为 `install-pack` 的用户级投放、多 stack、git URL 与缺失 `--stack` 补测试
- [x] 4.4 更新 `docs/surfaces.yaml` 与 `docs/codemaps/project-overview.md`
- [x] 4.5 为 `install-pack` 的 git pack 删除同步与多 pack prune 隔离补测试
