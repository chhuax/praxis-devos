# ECC 集成使用说明

这份文档描述 Praxis 项目接入 ECC 时，用户应该实际怎么走。

## 标准路径

1. 先正常执行 setup。

```bash
npx praxis-devos setup --agent codex --stack java-spring
```

2. 检查 ECC 是否已经绑定。

- 如果 `ecc` 已经在 `PATH` 上，或通过 `PRAXIS_ECC_RUNTIME`、`ECC_RUNTIME_DIR`、`ECC_HOME`、`.praxis/ecc-binding.json` 暴露给项目，Praxis 会在 `setup`、`init`、`use-foundation` 时自动识别。
- 如果 ECC 仍然未绑定，就显式绑定：

```bash
npx praxis-devos bind --ecc-runtime /path/to/ecc-runtime
```

3. 在绑定或 runtime 路径变化后刷新生成产物。

```bash
npx praxis-devos sync
```

4. 做最终验证。

```bash
npx praxis-devos doctor --strict
npx praxis-devos status
```

修复顺序固定为：

1. 先 bind ECC
2. 如有必要再 sync 刷新产物
3. 最后用 `doctor` 或 `status` 验证

## 生成的 Adapter 产物

当项目启用了内置 ECC runtime baseline 后，Praxis 会生成：

- `.praxis/adapters/ecc-commands/commands.json`
- `.praxis/adapters/ecc-commands/bin/ecc`，前提是 ECC 已绑定
- `.praxis/adapters/ecc-hooks/hooks/runtime-bound.json`，前提是 ECC 已绑定
- `.praxis/adapters/ecc-hooks/hooks/wiring-example.json`，前提是 ECC 已绑定

这些都是项目级生成产物。ECC runtime 路径变化后，重新执行 `bind` 或 `sync` 即可刷新。

## ECC Commands Adapter

`.praxis/adapters/ecc-commands/commands.json` 是 ECC 项目的最小命令契约。

当前暴露：

- `bind-runtime`：`npx praxis-devos bind --ecc-runtime <path>`
- `refresh-adapters`：`npx praxis-devos sync`
- `verify-runtime`：`npx praxis-devos doctor --strict`
- `status`：`npx praxis-devos status`
- `runtime-cli`：ECC 已绑定时对应 `.praxis/adapters/ecc-commands/bin/ecc`

如果你需要一个会跟随 Praxis binding 状态变化的项目级 ECC CLI 入口，就用 `runtime-cli`。

## ECC Hooks Adapter

`.praxis/adapters/ecc-hooks/hooks/runtime-bound.json` 暴露当前声明的 hook slots：

- `pre-task-environment`
- `post-change-audit`
- `session-evidence`

`.praxis/adapters/ecc-hooks/hooks/wiring-example.json` 则给出一个最小 wiring 示例，说明这些 slots 可以怎样挂到项目工作流节点上。它是 wiring 示例，不是自动安装器。

## 用户什么时候需要碰内部命令

大多数用户正常只需要从下面这些命令开始：

- `setup`
- ECC 未检测到时执行 `bind`
- `sync`
- `doctor`

`init` 和 `use-foundation` 仍然有效，但更偏高级命令或修复命令，不是标准 onboarding 主路径。
