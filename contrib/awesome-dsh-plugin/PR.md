# Add dsh-butler-memory

## 插件简介

DSH 的持久个人记忆组合包，同时打通两条通道：

1. **Agent 工具**：`mcp__butler__memory_*`（list/search/revisions/create/revise/
   archive/candidates + 候选 accept/reject），由 `dsh-mcp-client` 托管
   `butler-memory-mcp`（PyPI: [butler-memory-mcp](https://pypi.org/project/butler-memory-mcp)）
   子进程；
2. **Web 面板**：会话头部"记忆"按钮 → 分层记忆面板（记忆列表、类别/敏感度
   徽章、修订时间线、归档开关、候选接受/拒绝、服务健康状态）。

与官方 examples/mcp-memory 的差异：官方示例只有模型工具，本插件补上了
**用户可视、可审、可撤销**的记忆界面，且写入绑定 owner/revision/audit 语义
（写入仅 public/internal 敏感度、修改必须绑定当前 revision、推断事实以候选
存在绝不静默入库）。

## 安装

```bash
pip install butler-memory-mcp     # 按 README 配置 ~/.config/butler-memory-mcp/.env
dsh plugin add dsh-butler-memory
```

零手动运行：两条通道的子进程均由 DSH/插件自动托管，崩溃自动重启。

## 兼容性

- 已在 dsh 0.1.0-rc.6 实测：协议协商（MCP 2025-11-25）、headless agent 调用、
  Web 面板渲染、RPC 通道（`ctx.connection.rpc` contract）、模块表 bundle 格式
  （`__ModuleLoader__` + CJS factory）；
- `@deepseek-ai/*` 依赖以 `peerDependencies` 声明（对齐官方 client 包风格）；
- 已发布 npm（`dsh-butler-memory@0.1.2`），prebuilt 安装免 allowBuilds 授权。

## 截图（可选补充）

面板截图建议置于 `assets/` 目录并登记 `data/screenshots.json`。
