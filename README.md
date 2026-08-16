# dsh-butler-memory

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-bundle%20%2B%20client-purple)](https://github.com/deepseek-ai/DeepSeek-Harness)

> **DeepSeek Harness 的长期记忆：agent 能用，你也能看见。** 一个组合包同时打通
> 两条通道：模型获得 `mcp__butler__memory_*` 工具；Web 会话头部出现"记忆"按钮，
> 面板可查看记忆、敏感度徽章、修订历史与待决候选——写入依然绑定 owner/revision/
> audit，绝不静默入库。

DSH 组合包：把 [butler-memory-mcp](https://github.com/AndyYang12345/butler-memory-mcp) 的记忆能力接进 DeepSeek
Harness 的两条通道——

1. **给 agent**：声明一个 `dsh-mcp-client` 实例，spawn `ai-butler-memory-mcp`，
   模型获得 `mcp__butler__memory_*` 工具；
2. **给用户**：一个 Web 端"记忆"面板（会话头部按钮 + 对话框），可查看长期
   记忆、敏感度/类别徽章、推断候选并接受/拒绝——语义移植自
   ai-butler-framework 的 `web/index.html` 记忆面板。

```text
DSH agent ──mcp__butler__memory_*──► butler-memory-mcp (stdio MCP)
DSH web 面板 ──host.call──► host 半部 ──HTTP──► butler-memory-mcp (127.0.0.1:8771)
```

## 前置条件

1. 已安装 [butler-memory-mcp](https://github.com/AndyYang12345/butler-memory-mcp)
   （`pip install butler-memory-mcp`；stdio 由 DSH 自动 spawn，HTTP 面板模式需
   单独 `--transport http` 运行，默认 `127.0.0.1:8771`）；
2. Node 22+；`dsh` CLI 已安装。

## 安装

### 从 npm（发布后推荐）

```bash
dsh plugin add dsh-butler-memory
```

安装时 postinstall 会把 `butler-memory` skill 复制到
`$DSH_HOME/skills/butler-memory/`，DSH 的文件系统 skill 提供方会在所有
profile 中发现它；也可手动执行 `npm run install-skill` 重装。

### 本地开发（源码 checkout）

```bash
npm install
npm run build                # 构建 client/dist/client.js
dsh plugin add ..            # 本地路径安装到当前 profile
```

发布形态：`package.json` 同时声明 `dsh.bundle`（贡献 `cordis.patch.yml` 层）与
`dsh.client`（`platform: web`，浏览器 bundle 经 `/plugins/<id>/client.js` 注入）。

## 层顺序与覆盖

`cordis.patch.yml` 插入两行；用户可在自己的 `$DSH_HOME/cordis.patch.yml` 或
profile 的 `cordis.patch.yml` 整行覆盖（如换端口、换命令）。patch 是整行替换，
覆盖时需重述全部配置键。

## 验证（照搬官方 examples/mcp-memory 流程）

1. 会话 A：`记住我的验证饮品是 lapsang-<唯一后缀>。` → 确认调用写入工具成功；
2. 新会话 B：`我的验证饮品是什么？查一下记忆。` → 确认召回；
3. 会话 B：`用这个偏好为会议建议一款饮品。` → 确认回答使用了记忆；
4. 点击会话头部"记忆"按钮：面板显示该条记忆（含类别/敏感度徽章）；
   面板中接受/拒绝候选后，记忆服务状态即时变化。

## 与官方示例的差异（本插件卖点）

官方 `examples/mcp-memory` 只提供模型工具，**没有用户可视界面**。本组合包把
butler 的"用户可看、可审、可撤销"面板带到 DSH，且写入依然绑定框架的
owner/revision/audit 语义。

## 待办（首次集成时逐项核验）

- `cordis_inspect_list` 确认 `harness.handle` 签名与 `host` 注入名（host/index.js）；
- 确认 SlotCore.register 条目形状与 `host.call` 静态包访问方式（client/src/*）；
- 确认 React 是否由页面提供；否则把 build.mjs 的 `external` 移除自行打包。

详见 [PLAN.md](PLAN.md)。

## License

[Apache License 2.0](LICENSE)，与上游项目一致。本包仅包含接入配置与面板代码，
不包含任何第三方运行时、模型权重或专有素材。

## 相关项目

- [butler-memory-mcp](https://github.com/AndyYang12345/butler-memory-mcp) —
  记忆 MCP 服务器（本包的数据源）；
- `ai-butler-framework` — 记忆领域服务的实现方（上游）；
- [DSH 官方第三方记忆 MCP 示例](https://github.com/deepseek-ai/DeepSeek-Harness/tree/master/examples/mcp-memory) —
  本包接入方式的对齐基准。
