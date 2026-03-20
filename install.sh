#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# praxis-devos install.sh
# 将 praxis-devos 框架安装到目标项目
#
# 用法:
#   install.sh --stack yonbip-java [--dir /path/to/project] [--target opencode|claude|all] [--with-example] [--clean-examples]
#   install.sh --list-stacks
#   install.sh --check
#   install.sh --uninstall [--dir /path/to/project]
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR=""

# 默认参数
TARGET="all"
STACK=""
WITH_EXAMPLE=false
CLEAN_EXAMPLES=false
LIST_STACKS=false
UNINSTALL=false
CHECK_ENV=false

# 安装步骤计数
STEP_CURRENT=0
STEP_TOTAL=6

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ----------------------------------------------------------------------------
# 帮助信息
# ----------------------------------------------------------------------------
usage() {
    cat <<EOF
praxis-devos 安装脚本

用法:
  install.sh --stack <stack-name> [选项]

必选参数:
  --stack <name>       技术栈名称（如 yonbip-java）

可选参数:
  --dir <path>         目标项目目录（默认: 当前目录）
  --target <target>    AI 工具目标: opencode | claude | all (默认: all)
  --with-example       复制 project_example.md 到 openspec/project.md
  --clean-examples     安装后清理示例文件（如 _example 目录）
  --list-stacks        列出可用技术栈
  --check              检查运行环境（Node.js、Git、OpenSpec CLI）
  --uninstall          卸载框架文件
  -h, --help           显示帮助

示例:
  install.sh --stack yonbip-java                          # 安装到当前目录
  install.sh --stack yonbip-java --dir /path/to/project   # 安装到指定目录
  install.sh --stack yonbip-java --dir . --target claude
  install.sh --stack yonbip-java --with-example
  install.sh --check
  install.sh --list-stacks
  install.sh --uninstall --dir /path/to/project
EOF
    exit 0
}

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_step() {
    STEP_CURRENT=$((STEP_CURRENT + 1))
    echo ""
    echo -e "${BLUE}[$STEP_CURRENT/$STEP_TOTAL]${NC} $1"
}

check_command() {
    command -v "$1" >/dev/null 2>&1
}

do_check_env() {
    echo ""
    echo -e "${BLUE}praxis-devos 环境检查${NC}"
    echo ""
    local all_ok=true

    if check_command node; then
        local node_ver
        node_ver=$(node --version 2>/dev/null)
        log_ok "Node.js $node_ver"
    else
        log_error "Node.js 未安装"
        echo "       安装: https://nodejs.org/ 或 brew install node"
        all_ok=false
    fi

    if check_command npm; then
        local npm_ver
        npm_ver=$(npm --version 2>/dev/null)
        log_ok "npm $npm_ver"
    else
        log_error "npm 未安装（通常随 Node.js 一起安装）"
        echo "       安装: https://nodejs.org/"
        all_ok=false
    fi

    if check_command git; then
        local git_ver
        git_ver=$(git --version 2>/dev/null)
        log_ok "$git_ver"
    else
        log_error "Git 未安装"
        echo "       安装: https://git-scm.com/ 或 brew install git"
        all_ok=false
    fi

    if check_command openspec; then
        local os_ver
        os_ver=$(openspec --version 2>/dev/null || echo "unknown")
        log_ok "OpenSpec CLI $os_ver"
    else
        log_warn "OpenSpec CLI 未安装（安装脚本会自动安装）"
        echo "       手动安装: npm install -g @fission-ai/openspec@latest"
    fi

    echo ""
    if [ "$all_ok" = true ]; then
        log_ok "环境检查通过，可以安装"
    else
        log_error "请先安装缺失的依赖"
    fi
    exit 0
}

clean_examples() {
    log_info "清理示例文件..."
    local cleaned=false

    if [ -d "$TARGET_DIR/openspec/specs/_example" ]; then
        rm -rf "$TARGET_DIR/openspec/specs/_example"
        log_ok "删除 openspec/specs/_example/"
        cleaned=true
    fi

    if [ "$cleaned" = false ]; then
        log_info "无示例文件需要清理"
    fi
}

install_openspec_cli() {
    log_info "检查 OpenSpec CLI..."

    if check_command openspec; then
        local version
        version=$(openspec --version 2>/dev/null || echo "unknown")
        log_ok "OpenSpec CLI 已安装 ($version)"
        return
    fi

    log_info "安装 OpenSpec CLI..."

    if ! check_command npm; then
        log_error "未找到 npm。请先安装 Node.js (>= 20.19.0)"
        echo "       安装: https://nodejs.org/ 或 brew install node"
        exit 1
    fi

    if npm install -g @fission-ai/openspec@latest; then
        log_ok "OpenSpec CLI 安装成功"
    else
        log_error "OpenSpec CLI 安装失败"
        exit 1
    fi
}

install_superpowers() {
    local target_tool="$1"

    if [ "$target_tool" = "claude" ]; then
        log_info "SuperPowers 安装（Claude Code）"
        echo "  请在 Claude Code 中手动执行："
        echo "    /plugin marketplace add obra/superpowers-marketplace"
        echo "    /plugin install superpowers@superpowers-marketplace"
        return
    fi

    if [ "$target_tool" != "opencode" ] && [ "$target_tool" != "all" ]; then
        return
    fi

    log_info "检查 SuperPowers 插件（OpenCode）..."

    local sp_dir="$HOME/.config/opencode/superpowers"
    local plugin_link="$HOME/.config/opencode/plugins/superpowers.js"
    local skills_link="$HOME/.config/opencode/skills/superpowers"

    if [ -L "$plugin_link" ] && [ -L "$skills_link" ]; then
        log_ok "SuperPowers 已安装"
        return
    fi

    log_info "安装 SuperPowers 插件..."

    if ! check_command git; then
        log_error "未找到 git。请先安装 git"
        echo "       安装: https://git-scm.com/ 或 brew install git"
        exit 1
    fi

    if [ ! -d "$sp_dir" ]; then
        if git clone https://github.com/obra/superpowers.git "$sp_dir"; then
            log_ok "SuperPowers 仓库克隆成功"
        else
            log_error "SuperPowers 克隆失败"
            exit 1
        fi
    else
        log_ok "SuperPowers 仓库已存在"
    fi

    mkdir -p "$HOME/.config/opencode/plugins" "$HOME/.config/opencode/skills"

    if [ ! -L "$plugin_link" ]; then
        ln -sf "$sp_dir/.opencode/plugins/superpowers.js" "$plugin_link"
        log_ok "插件符号链接已创建"
    fi

    if [ ! -L "$skills_link" ]; then
        ln -sf "$sp_dir/skills" "$skills_link"
        log_ok "Skills 符号链接已创建"
    fi

    log_ok "SuperPowers 安装完成（需重启 OpenCode）"
}

list_stacks() {
    echo "可用技术栈："
    for dir in "$SCRIPT_DIR"/stacks/*/; do
        [ -d "$dir" ] || continue
        local name
        name="$(basename "$dir")"
        local desc=""
        if [ -f "$dir/stack.md" ]; then
            desc=$(head -1 "$dir/stack.md" | sed 's/^# //')
        fi
        echo "  $name  —  $desc"
    done
    exit 0
}

copy_file() {
    local src="$1" dst="$2"
    if [ "$src" = "$dst" ]; then
        return
    fi
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
}

copy_dir() {
    local src="$1" dst="$2"
    if [ "$src" = "$dst" ]; then
        return
    fi
    mkdir -p "$dst"
    cp -R "$src"/* "$dst"/ 2>/dev/null || true
}

install_framework() {
    log_info "安装框架核心文件..."

    copy_file "$SCRIPT_DIR/AGENTS.md" "$TARGET_DIR/AGENTS.md"
    copy_file "$SCRIPT_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
    log_ok "AGENTS.md, CLAUDE.md"

    mkdir -p "$TARGET_DIR/openspec/specs" "$TARGET_DIR/openspec/changes" \
             "$TARGET_DIR/openspec/archive" "$TARGET_DIR/openspec/templates"

    copy_file "$SCRIPT_DIR/openspec/AGENTS.md" "$TARGET_DIR/openspec/AGENTS.md"
    copy_file "$SCRIPT_DIR/openspec/templates/PROPOSAL_TEMPLATE.md" "$TARGET_DIR/openspec/templates/PROPOSAL_TEMPLATE.md"
    copy_file "$SCRIPT_DIR/openspec/templates/TASKS_TEMPLATE.md" "$TARGET_DIR/openspec/templates/TASKS_TEMPLATE.md"

    if [ -f "$SCRIPT_DIR/openspec/specs/_example/spec.md" ]; then
        mkdir -p "$TARGET_DIR/openspec/specs/_example"
        copy_file "$SCRIPT_DIR/openspec/specs/_example/spec.md" "$TARGET_DIR/openspec/specs/_example/spec.md"
    fi

    if [ ! -f "$TARGET_DIR/openspec/project.md" ]; then
        copy_file "$SCRIPT_DIR/openspec/project.md" "$TARGET_DIR/openspec/project.md"
        log_ok "openspec/project.md（空模板）"
    else
        log_warn "openspec/project.md 已存在，跳过"
    fi

    log_ok "openspec/ 目录"
}

install_stack() {
    local stack_dir="$SCRIPT_DIR/stacks/$STACK"

    if [ ! -d "$stack_dir" ]; then
        log_error "技术栈 '$STACK' 不存在。使用 --list-stacks 查看可用技术栈。"
        exit 1
    fi

    log_info "安装技术栈: $STACK"

    mkdir -p "$TARGET_DIR/stacks/$STACK"
    copy_file "$stack_dir/stack.md" "$TARGET_DIR/stacks/$STACK/stack.md"
    copy_file "$stack_dir/rules.md" "$TARGET_DIR/stacks/$STACK/rules.md"
    log_ok "stacks/$STACK/stack.md, rules.md"

    if [ "$WITH_EXAMPLE" = true ] && [ -f "$stack_dir/project_example.md" ]; then
        copy_file "$stack_dir/project_example.md" "$TARGET_DIR/openspec/project.md"
        log_ok "project_example.md → openspec/project.md"
    fi
}

install_skills() {
    local skills_src="$SCRIPT_DIR/.claude/skills"

    if [ ! -d "$skills_src" ]; then
        log_warn "未找到 skills 目录: $skills_src"
        return
    fi

    log_info "安装 Skills → .claude/skills/"

    for skill_dir in "$skills_src"/*/; do
        [ -d "$skill_dir" ] || continue
        local skill_name
        skill_name="$(basename "$skill_dir")"

        if [ -f "$skill_dir/SKILL.md" ]; then
            mkdir -p "$TARGET_DIR/.claude/skills/$skill_name"
            copy_file "$skill_dir/SKILL.md" "$TARGET_DIR/.claude/skills/$skill_name/SKILL.md"
            log_ok "  $skill_name"
        fi
    done
}

install_hooks() {
    local hooks_src="$SCRIPT_DIR/.githooks"

    if [ ! -d "$hooks_src" ]; then
        log_warn "未找到 hooks 目录: $hooks_src"
        return
    fi

    log_info "安装 Git Hooks → .githooks/"

    mkdir -p "$TARGET_DIR/.githooks"

    for hook_file in "$hooks_src"/*; do
        [ -f "$hook_file" ] || continue
        local hook_name
        hook_name="$(basename "$hook_file")"
        copy_file "$hook_file" "$TARGET_DIR/.githooks/$hook_name"
        chmod +x "$TARGET_DIR/.githooks/$hook_name"
        log_ok "  $hook_name"
    done

    # 如果目标是 git 仓库，配置 core.hooksPath
    if [ -d "$TARGET_DIR/.git" ]; then
        (cd "$TARGET_DIR" && git config core.hooksPath .githooks)
        log_ok "已配置 git core.hooksPath → .githooks/"
    else
        log_info "目标非 git 仓库，hooks 已复制但未激活"
        echo "       激活: cd $TARGET_DIR && git config core.hooksPath .githooks"
    fi
}

do_uninstall() {
    log_info "卸载 praxis-devos 框架..."

    local files_to_remove=(
        "$TARGET_DIR/AGENTS.md"
        "$TARGET_DIR/CLAUDE.md"
    )
    local dirs_to_remove=(
        "$TARGET_DIR/openspec"
        "$TARGET_DIR/.claude/skills"
        "$TARGET_DIR/stacks"
        "$TARGET_DIR/.githooks"
    )

    for f in "${files_to_remove[@]}"; do
        if [ -f "$f" ]; then
            rm "$f"
            log_ok "删除 $(basename "$f")"
        fi
    done

    for d in "${dirs_to_remove[@]}"; do
        if [ -d "$d" ]; then
            rm -rf "$d"
            log_ok "删除 ${d#$TARGET_DIR/}"
        fi
    done

    if [ -d "$TARGET_DIR/.git" ]; then
        local hooks_path
        hooks_path=$(cd "$TARGET_DIR" && git config --get core.hooksPath 2>/dev/null || true)
        if [ "$hooks_path" = ".githooks" ]; then
            (cd "$TARGET_DIR" && git config --unset core.hooksPath)
            log_ok "重置 git core.hooksPath"
        fi
    fi

    log_ok "卸载完成"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --target)     TARGET="$2"; shift 2 ;;
        --stack)      STACK="$2"; shift 2 ;;
        --dir)        TARGET_DIR="$2"; shift 2 ;;
        --with-example) WITH_EXAMPLE=true; shift ;;
        --clean-examples) CLEAN_EXAMPLES=true; shift ;;
        --list-stacks)  LIST_STACKS=true; shift ;;
        --uninstall)    UNINSTALL=true; shift ;;
        --check)        CHECK_ENV=true; shift ;;
        -h|--help)      usage ;;
        *) log_error "未知参数: $1"; usage ;;
    esac
done

if [ "$LIST_STACKS" = true ]; then
    list_stacks
fi

if [ "$CHECK_ENV" = true ]; then
    do_check_env
fi

if [ -z "$TARGET_DIR" ]; then
    TARGET_DIR="$(pwd)"
fi

TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)" || {
    log_error "目标目录不存在: $TARGET_DIR"
    exit 1
}

SAME_DIR=false
if [ "$SCRIPT_DIR" = "$TARGET_DIR" ]; then
    SAME_DIR=true
fi

if [ "$UNINSTALL" = true ]; then
    do_uninstall
fi

if [ -z "$STACK" ]; then
    log_error "必须指定 --stack 参数"
    usage
fi

case "$TARGET" in
    opencode|claude|all) ;;
    *) log_error "无效的 --target: $TARGET（可选: opencode | claude | all）"; exit 1 ;;
esac

echo ""
echo -e "${BLUE}praxis-devos 安装${NC}"
echo -e "  目标项目: ${GREEN}$TARGET_DIR${NC}"
echo -e "  技术栈:   ${GREEN}$STACK${NC}"
echo -e "  AI 工具:  ${GREEN}$TARGET${NC}"
if [ "$SAME_DIR" = true ]; then
    echo -e "  模式:     ${YELLOW}原地安装（跳过文件拷贝）${NC}"
fi

if [ "$CLEAN_EXAMPLES" = true ]; then
    STEP_TOTAL=7
fi

log_step "安装框架核心文件..."
install_framework

log_step "安装技术栈: $STACK"
install_stack

log_step "安装 Skills..."
install_skills

log_step "安装 Git Hooks..."
install_hooks

log_step "安装外部依赖..."
install_openspec_cli
install_superpowers "$TARGET"

log_step "初始化 OpenSpec..."
if check_command openspec && [ -d "$TARGET_DIR/openspec" ]; then
    (cd "$TARGET_DIR" && openspec init --force 2>/dev/null) || log_warn "OpenSpec init 跳过（可能已初始化）"
else
    log_warn "OpenSpec CLI 未就绪，跳过初始化"
fi

if [ "$CLEAN_EXAMPLES" = true ]; then
    log_step "清理示例文件..."
    clean_examples
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "快速开始："
echo ""
echo "  1. 填写项目信息："
echo "     编辑 openspec/project.md，描述你的项目上下文"
if [ -f "$SCRIPT_DIR/stacks/$STACK/project_example.md" ] && [ "$WITH_EXAMPLE" = false ]; then
    echo "     (参考示例: stacks/$STACK/project_example.md)"
fi
echo ""
echo "  2. 检查技术栈配置："
echo "     查看 stacks/$STACK/stack.md 确认构建命令等配置"
echo ""
echo "  3. 查看现有规范："
echo "     openspec list --specs"
echo ""
echo "  4. 开始开发："
if [ "$TARGET" = "opencode" ] || [ "$TARGET" = "all" ]; then
    echo "     重启 OpenCode 以加载插件，然后使用 AI 编码助手"
fi
if [ "$TARGET" = "claude" ] || [ "$TARGET" = "all" ]; then
    echo "     在 Claude Code 中安装 SuperPowers（见上方提示）"
fi
echo ""
echo "  常用命令："
echo "     openspec list              # 查看活跃变更"
echo "     openspec list --specs      # 查看现有规范"
echo "     openspec validate <id>     # 验证提案"
