# dsh-butler-memory 移植规划与实施步骤

> 状态：P0 骨架已落地；P1 起需在真实 DSH 运行时内逐步核验。
> 配套：`butler-memory-mcp`（Python 侧，见同目录 PLAN.md）。

## 1. 目标

- **模型通道**：`dsh-mcp-client` 实例 + stdio bridge → `mcp__butler__memory_*`；
- **面板通道**：客户端 Slot 按钮 + host.call/harness.handle 代理 + loopback HTTP；
- 语义来源：ai-butler-framework `web/index.html`（306-401 行记忆对话框）与
  `app.js` 的记忆渲染逻辑（列表/徽章/候选/归档开关）。

## 2. 移植映射（butler → DSH）

| butler 组件 | DSH 落点 | 移植方式 |
|---|---|---|
| 导航"记忆"按钮（index.html:80） | Slot `conversation.session.header.actions` | 重写为 React 组件注册（`client/src/index.tsx`） |
| 记忆对话框 + 列表 | overlay 组件（`MemoryPanel.tsx`） | 语义照搬，DOM 重写为 React |
| kind/lifecycle/sensitivity 徽章 | `bm-badge--*` 样式 | 标签表照搬（KIND_LABELS 等） |
| 记忆候选区 + 接受/拒绝 | `candidates` 视图 + 两个 POST | `LayeredMemoryService` 语义不变，走 host.call |
| scope 门控（memory:read/write） | Python 桥设备 scope（服务端强制） | 面板不做客户端门控，服务端 403 即失败 |
| 归档开关（include_archived） | `butler-memory.list` 参数 | 同参数透传 |
| Persona 编辑区 | v0.1 不做 | 属后续切片，见 §5 |

## 3. 阶段与步骤

### P0 — 骨架（已落地）

文件：`package.json`（dsh.bundle + dsh.client + exports "./client"）、
`cordis.patch.yml`、`host/index.js`（harness.handle 六个代理端点）、
`client/src/`（Slot 按钮 + 面板 + hostClient 持有器 + 内联样式）、
`build.mjs`、`skills/butler-memory/SKILL.md`。

验收：`node --check host/index.js` 通过；`npm run build` 产出
`client/dist/client.js`。

### P1 — 真实 DSH 核验（每步在真实运行时内完成，勿凭假设）

1. `cordis_inspect_list`：确认 `harness` 服务与 `handle(method, fn)` 签名；
2. `cordis_inspect_query`：确认 Slot `conversation.session.header.actions` 的
   owner props 与 `SlotCore.register` 条目形状；确认静态 client 包的
   `host.call` 访问方式与 `host` 注入名；
3. 按核验结果修正 `host/index.js`、`client/src/*`、`inject` 列表；
4. `dsh plugin add ..` 安装，`dsh web --dump-config` 确认两行 patch 生效；
5. 走 README 的 5 步验证（写入→跨会话召回→面板查看→候选决定）。

验收：官方 examples/mcp-memory 验证流程全绿；面板按钮出现在会话头部。

### P2 — 面板补全（对照 butler 原面板）

1. 修订历史视图（点开单条记忆 → `butler-memory.revisions` → 时间线）；
2. 归档开关 + 恢复展示（服务层已有 `list_memories(include_archived)`）；
3. 空态/错误态与窄屏样式打磨（butler 有桌面+窄屏验收要求，此处同样需要）；
4. 候选决定后的即时刷新与防重复点击。

### P3 — 发布

1. npm 发布 `dsh-butler-memory`（README 明示 Python 桥为前置依赖）；
2. 提交到 awesome-dsh-plugin 等社区清单；
3. 命名/商标检查（与 Python 侧同步）。

## 4. 关键风险

| 风险 | 缓解 |
|---|---|
| 静态 client 插件的 `host.call`/Slot 注册 API 与本骨架假设不一致 | P1 步骤 1-3 强制核验，未核验不进 P2 |
| React 是否由页面提供未定 | build.mjs 已留开关：external 移除即自行打包 |
| 面板 HTTP 无认证 | 仅 loopback + 只读 + 候选决定；跨机形态留到框架 P10 |
| MCP 写入无浏览器确认 | SKILL.md 硬规则 + Python 侧敏感度封顶；后续可接 DSH ask-user |
| DSH 版本迭代（rc 阶段） | peerDependencies 固定 `>=0.1.0-rc.6`；升级时重跑 P1 核验 |

## 5. 明确延后

- Persona 编辑面板（需先定 Persona 是否仍归框架 HTTP API）；
- 记忆导出/备份 UI（框架 P9 之后）；
- 多用户 principal 映射（框架侧设计先行）。
