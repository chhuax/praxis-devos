# ============================================================================
# praxis-devos install.ps1
# 将 praxis-devos 框架安装到目标项目（Windows PowerShell）
#
# 用法:
#   .\install.ps1 -Stack yonbip-java [-Target opencode|claude|all] [-WithExample]
#   .\install.ps1 -ListStacks
#   .\install.ps1 -Uninstall
# ============================================================================

[CmdletBinding()]
param(
    [string]$Stack = "",
    [ValidateSet("opencode", "claude", "all")]
    [string]$Target = "all",
    [switch]$WithExample,
    [switch]$ListStacks,
    [switch]$Uninstall,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = Get-Location

function Write-Info  { param([string]$Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Blue }
function Write-Ok    { param([string]$Msg) Write-Host "[OK]    $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "[WARN]  $Msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red }

function Show-Usage {
    @"
praxis-devos 安装脚本 (Windows)

用法:
  .\install.ps1 -Stack <stack-name> [选项]

必选参数:
  -Stack <name>       技术栈名称（如 yonbip-java）

可选参数:
  -Target <target>    AI 工具目标: opencode | claude | all (默认: all)
  -WithExample        复制 project_example.md 到 openspec/project.md
  -ListStacks         列出可用技术栈
  -Uninstall          卸载框架文件
  -Help               显示帮助

示例:
  .\install.ps1 -Stack yonbip-java
  .\install.ps1 -Stack yonbip-java -Target claude
  .\install.ps1 -Stack yonbip-java -WithExample
  .\install.ps1 -ListStacks
  .\install.ps1 -Uninstall
"@
    exit 0
}

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Copy-FileForce {
    param([string]$Src, [string]$Dst)
    $dir = Split-Path -Parent $Dst
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item -Path $Src -Destination $Dst -Force
}

function Show-ListStacks {
    Write-Host "可用技术栈："
    Get-ChildItem -Path "$ScriptDir\stacks" -Directory | ForEach-Object {
        $name = $_.Name
        $desc = ""
        $stackFile = Join-Path $_.FullName "stack.md"
        if (Test-Path $stackFile) {
            $desc = (Get-Content $stackFile -TotalCount 1) -replace "^# ", ""
        }
        Write-Host "  $name  —  $desc"
    }
    exit 0
}

function Install-Framework {
    Write-Info "安装框架核心文件..."

    Copy-FileForce "$ScriptDir\AGENTS.md" "$TargetDir\AGENTS.md"
    Copy-FileForce "$ScriptDir\CLAUDE.md" "$TargetDir\CLAUDE.md"
    Write-Ok "AGENTS.md, CLAUDE.md"

    $openspecDirs = @("specs", "changes", "archive", "templates")
    foreach ($d in $openspecDirs) {
        $p = Join-Path $TargetDir "openspec\$d"
        if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
    }

    Copy-FileForce "$ScriptDir\openspec\AGENTS.md" "$TargetDir\openspec\AGENTS.md"
    Copy-FileForce "$ScriptDir\openspec\templates\PROPOSAL_TEMPLATE.md" "$TargetDir\openspec\templates\PROPOSAL_TEMPLATE.md"
    Copy-FileForce "$ScriptDir\openspec\templates\TASKS_TEMPLATE.md" "$TargetDir\openspec\templates\TASKS_TEMPLATE.md"

    $exampleSpec = "$ScriptDir\openspec\specs\_example\spec.md"
    if (Test-Path $exampleSpec) {
        $dst = "$TargetDir\openspec\specs\_example"
        if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }
        Copy-FileForce $exampleSpec "$dst\spec.md"
    }

    $projectMd = "$TargetDir\openspec\project.md"
    if (-not (Test-Path $projectMd)) {
        Copy-FileForce "$ScriptDir\openspec\project.md" $projectMd
        Write-Ok "openspec/project.md（空模板）"
    } else {
        Write-Warn "openspec/project.md 已存在，跳过"
    }

    Write-Ok "openspec/ 目录"
}

function Install-Stack {
    $stackDir = Join-Path $ScriptDir "stacks\$Stack"

    if (-not (Test-Path $stackDir)) {
        Write-Err "技术栈 '$Stack' 不存在。使用 -ListStacks 查看可用技术栈。"
        exit 1
    }

    Write-Info "安装技术栈: $Stack"

    $dstStack = Join-Path $TargetDir "stacks\$Stack"
    if (-not (Test-Path $dstStack)) { New-Item -ItemType Directory -Path $dstStack -Force | Out-Null }

    Copy-FileForce "$stackDir\stack.md" "$dstStack\stack.md"
    Copy-FileForce "$stackDir\rules.md" "$dstStack\rules.md"
    Write-Ok "stacks/$Stack/stack.md, rules.md"

    if ($WithExample) {
        $example = Join-Path $stackDir "project_example.md"
        if (Test-Path $example) {
            Copy-FileForce $example "$TargetDir\openspec\project.md"
            Write-Ok "project_example.md → openspec/project.md"
        }
    }
}

function Install-Skills {
    $skillsSrc = Join-Path $ScriptDir ".claude\skills"

    if (-not (Test-Path $skillsSrc)) {
        Write-Warn "未找到 skills 目录: $skillsSrc"
        return
    }

    Write-Info "安装 Skills → .claude/skills/"

    Get-ChildItem -Path $skillsSrc -Directory | ForEach-Object {
        $skillName = $_.Name
        $skillFile = Join-Path $_.FullName "SKILL.md"
        if (Test-Path $skillFile) {
            $dst = Join-Path $TargetDir ".claude\skills\$skillName"
            if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }
            Copy-FileForce $skillFile "$dst\SKILL.md"
            Write-Ok "  $skillName"
        }
    }
}

function Install-OpenSpecCli {
    Write-Info "检查 OpenSpec CLI..."

    if (Test-Command "openspec") {
        $version = try { & openspec --version 2>$null } catch { "unknown" }
        Write-Ok "OpenSpec CLI 已安装 ($version)"
        return
    }

    Write-Info "安装 OpenSpec CLI..."

    if (-not (Test-Command "npm")) {
        Write-Err "未找到 npm。请先安装 Node.js (>= 20.19.0)"
        exit 1
    }

    try {
        & npm install -g "@fission-ai/openspec@latest" 2>&1 | Out-Null
        Write-Ok "OpenSpec CLI 安装成功"
    } catch {
        Write-Err "OpenSpec CLI 安装失败: $_"
        exit 1
    }
}

function Install-SuperPowers {
    param([string]$TargetTool)

    if ($TargetTool -eq "claude") {
        Write-Info "SuperPowers 安装（Claude Code）"
        Write-Host "  请在 Claude Code 中手动执行："
        Write-Host "    /plugin marketplace add obra/superpowers-marketplace"
        Write-Host "    /plugin install superpowers@superpowers-marketplace"
        return
    }

    if ($TargetTool -ne "opencode" -and $TargetTool -ne "all") { return }

    Write-Info "检查 SuperPowers 插件（OpenCode）..."

    $configDir = Join-Path $env:USERPROFILE ".config\opencode"
    $spDir = Join-Path $configDir "superpowers"
    $pluginsDir = Join-Path $configDir "plugins"
    $skillsDir = Join-Path $configDir "skills"
    $pluginTarget = Join-Path $spDir ".opencode\plugins\superpowers.js"
    $pluginLink = Join-Path $pluginsDir "superpowers.js"
    $skillsLink = Join-Path $skillsDir "superpowers"
    $skillsTarget = Join-Path $spDir "skills"

    if ((Test-Path $pluginLink) -and (Test-Path $skillsLink)) {
        Write-Ok "SuperPowers 已安装"
        return
    }

    Write-Info "安装 SuperPowers 插件..."

    if (-not (Test-Command "git")) {
        Write-Err "未找到 git。请先安装 git"
        exit 1
    }

    if (-not (Test-Path $spDir)) {
        try {
            & git clone "https://github.com/obra/superpowers.git" $spDir 2>&1 | Out-Null
            Write-Ok "SuperPowers 仓库克隆成功"
        } catch {
            Write-Err "SuperPowers 克隆失败: $_"
            exit 1
        }
    } else {
        Write-Ok "SuperPowers 仓库已存在"
    }

    if (-not (Test-Path $pluginsDir)) { New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null }
    if (-not (Test-Path $skillsDir)) { New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null }

    if (-not (Test-Path $pluginLink)) {
        New-Item -ItemType SymbolicLink -Path $pluginLink -Target $pluginTarget -Force | Out-Null
        Write-Ok "插件符号链接已创建"
    }

    if (-not (Test-Path $skillsLink)) {
        New-Item -ItemType SymbolicLink -Path $skillsLink -Target $skillsTarget -Force | Out-Null
        Write-Ok "Skills 符号链接已创建"
    }

    Write-Ok "SuperPowers 安装完成（需重启 OpenCode）"
}

function Invoke-Uninstall {
    Write-Info "卸载 praxis-devos 框架..."

    $filesToRemove = @("$TargetDir\AGENTS.md", "$TargetDir\CLAUDE.md")
    $dirsToRemove = @("$TargetDir\openspec", "$TargetDir\.claude\skills", "$TargetDir\stacks")

    foreach ($f in $filesToRemove) {
        if (Test-Path $f) {
            Remove-Item $f -Force
            Write-Ok "删除 $(Split-Path -Leaf $f)"
        }
    }

    foreach ($d in $dirsToRemove) {
        if (Test-Path $d) {
            Remove-Item $d -Recurse -Force
            $rel = $d -replace [regex]::Escape("$TargetDir\"), ""
            Write-Ok "删除 $rel"
        }
    }

    Write-Ok "卸载完成"
    exit 0
}

# === 主流程 ===

if ($Help) { Show-Usage }
if ($ListStacks) { Show-ListStacks }
if ($Uninstall) { Invoke-Uninstall }

if ([string]::IsNullOrEmpty($Stack)) {
    Write-Err "必须指定 -Stack 参数"
    Show-Usage
}

Write-Host ""
Write-Host "praxis-devos 安装" -ForegroundColor Blue
Write-Host "  目标项目: $TargetDir" -ForegroundColor Green
Write-Host "  技术栈:   $Stack" -ForegroundColor Green
Write-Host "  AI 工具:  $Target" -ForegroundColor Green
Write-Host ""

Install-Framework
Install-Stack
Install-Skills

Write-Host ""
Write-Info "安装外部依赖..."
Install-OpenSpecCli
Install-SuperPowers -TargetTool $Target

if (Test-Command "openspec") {
    $openspecDir = Join-Path $TargetDir "openspec"
    if (Test-Path $openspecDir) {
        Write-Info "初始化 OpenSpec..."
        try {
            Push-Location $TargetDir
            & openspec init --force 2>$null
            Pop-Location
        } catch {
            Write-Warn "OpenSpec init 跳过（可能已初始化）"
            Pop-Location
        }
    }
}

Write-Host ""
Write-Ok "安装完成！"
Write-Host ""
Write-Host "下一步："
Write-Host "  1. 编辑 openspec/project.md 填写项目信息"
Write-Host "  2. 检查 stacks/$Stack/stack.md 确认技术栈配置"
if ($Target -eq "opencode" -or $Target -eq "all") {
    Write-Host "  3. 重启 OpenCode 以加载 SuperPowers 插件"
    Write-Host "  4. 开始使用 AI 编码助手"
} else {
    Write-Host "  3. 在 Claude Code 中安装 SuperPowers（见上方提示）"
    Write-Host "  4. 开始使用 AI 编码助手"
}
