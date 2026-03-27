# OpenCode Codex Claude Code Surfaces

• 结论先说，按我查到的官方资料，有重叠，而且有些会叠加生效。所以不能“同一份规则到处再投一份”而不做设计。

  当前原生支持矩阵

  - Claude Code 原生看 CLAUDE.md，不原生读 AGENTS.md。Anthropic 还明确写了：如果仓库已有 AGENTS.md，应该在 CLAUDE.md 里
    @AGENTS.md 导入它。
    来源：
      - Claude memory docs: https://code.claude.com/docs/en/memory
      - 关键点在“Claude Code reads CLAUDE.md, not AGENTS.md”和 @AGENTS.md 示例
  - OpenCode 原生看 AGENTS.md，而且兼容回退 CLAUDE.md。但规则优先级是：
      1. 本地向上查找 AGENTS.md / CLAUDE.md
      2. ~/.config/opencode/AGENTS.md
      3. ~/.claude/CLAUDE.md
         并且如果同层同时有 AGENTS.md 和 CLAUDE.md，只用 AGENTS.md。
         来源：
      - OpenCode rules docs: https://opencode.ai/docs/rules
  - OpenCode 另外还会把 opencode.json 里的 instructions 和 AGENTS.md 合并；plugin 也会同时加载全局和项目级。
    来源：
      - OpenCode rules docs: https://opencode.ai/docs/rules
      - OpenCode plugins docs: https://opencode.ai/docs/plugins/
  - Codex 这块官方口径目前不够稳定。能确认的是项目里的 AGENTS.md 是它的可靠入口；但全局到底是 ~/.codex/AGENTS.md 还是
    ~/.codex/instructions.md，官方仓库历史上有过文档冲突，而且还有关于全局指令未生效的 issue。
    来源：
      - OpenAI 官方仓库 issue: https://github.com/openai/codex/issues/1132
      - https://github.com/openai/codex/issues/3540
      - https://github.com/openai/codex/issues/960

  你问的几个具体点

  - OpenCode 除了 .opencode，还支持 AGENTS.md，并且兼容 CLAUDE.md。
  - 我没有查到 OpenCode 原生支持 .agent 这个目录。
  - OpenCode 查到的是 .opencode/agents/、.opencode/plugins/、.opencode/skills/，以及 .agents/skills/ 这种兼容路径，但不
    是 .agent。
    来源：
      - agents: https://opencode.ai/docs/agents
      - plugins: https://opencode.ai/docs/plugins/
      - skills: https://opencode.ai/docs/skills

  会不会冲突
  会，分三种情况：

  1. AGENTS.md + CLAUDE.md

  - 对 OpenCode：如果同层都有，AGENTS.md 胜出，CLAUDE.md 不会再重复生效。
  - 对 Claude：只看 CLAUDE.md。
  - 所以这组不会双重加载同一层，但容易内容漂移。

  2. AGENTS.md + .opencode/opencode.json 的 instructions

  - 对 OpenCode：会叠加。
  - 官方写的是 instruction files are combined with AGENTS.md。
  - 这时如果你把同一份规则再投一份，就会重复甚至冲突。

  3. ~/.config/opencode/plugins/ + .opencode/plugins/

  - 对 OpenCode：都会加载，按顺序执行。
  - 官方写的是 all hooks run in sequence，加载顺序是全局 config、项目 config、全局 plugin、项目 plugin。
  - 所以同一逻辑投两份，hook 很可能跑两次。

  我建议的落地原则

  - 共享项目规则：只放一份 AGENTS.md
  - Claude：放一个很薄的 CLAUDE.md，内容主要是 @AGENTS.md，再追加少量 Claude 专属内容
  - OpenCode：不要把项目共性规则再复制到 .opencode/instructions
  - OpenCode plugin：全局和项目二选一，不要同一 hook 两边都投
  - .agent 目录不要当原生入口用
  - Codex 先把项目级 AGENTS.md 当唯一稳定入口；全局投放先别假设稳定

  最稳的模式是：

  - AGENTS.md 作为跨 agent 的共享主文件
  - CLAUDE.md 只做 @AGENTS.md 包装
  - .opencode/* 只放 OpenCode 专属配置和 plugin，不重复项目规则

  如果你要，我下一步可以直接把这个仓库的投放策略改成这个模型，顺便加一层“冲突保护”，避免同一规则被同时投到 AGENTS.md、
  CLAUDE.md、.opencode/instructions 里。
