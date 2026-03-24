# Starter 技术栈模板

> 这个目录用于创建你自己的技术栈。它提供的是最小可用骨架，不是最终项目标准。

## 基本信息

| 字段 | 值 |
|------|----|
| 名称 | starter |
| 显示名 | Starter Template |
| 运行时 | （填写你的运行时） |
| 框架 | （填写你的框架） |
| 构建工具 | （填写你的构建工具） |

## 工具链命令

```yaml
commands:
  build: "echo 'Configure your build command'"
  test: "echo 'Configure your test command'"
  verify: "echo 'Configure your verify command'"
  lint: "echo 'Configure your lint command'"
```

## 栈专属 Skills

这个模板默认不包含任何领域 skill。需要时可以添加：

1. 创建 `stacks/<your-stack>/skills/{skill-name}/SKILL.md`
2. 在本文件中补充该 skill 的说明
3. 运行 `praxis-devos init --stack <your-stack>` 或 `praxis-devos sync`

安装到项目后，skills 会复制到 `.praxis/skills/`，后续可按公司或项目规范继续修改。

## 包含的规则

| 文件 | 说明 |
|------|------|
| `rules.md` | 通用初始编码基线 |
