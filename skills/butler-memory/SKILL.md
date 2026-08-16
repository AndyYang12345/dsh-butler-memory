---
name: butler-memory
description: Durable personal long-term memory. Use when the user asks to remember something, when historical facts, preferences or project context may be relevant, or when the user wants to review, revise or forget stored memories. Backed by the Butler layered memory service over MCP (mcp__butler__memory_*).
---

# Butler 长期记忆

Butler 记忆是**用户拥有的持久长期记忆**，存储在本地 PostgreSQL 中，与任何
会话、模型或会话历史无关。写入有 revision 版本与审计历史；修改与归档必须
绑定当前 revision，冲突会显式报错。

## 工具

| 工具 | 用途 |
| --- | --- |
| `mcp__butler__memory_search` | 检索活跃记忆（自动排除 private/secret，internal 封顶） |
| `mcp__butler__memory_list` | 分页列出记忆；仅在用户要求查看已归档内容时带 `include_archived` |
| `mcp__butler__memory_revisions` | 查看一条记忆的不可变修订历史 |
| `mcp__butler__memory_create` | 用户明确要求"记住"时写入；敏感度仅 public/internal |
| `mcp__butler__memory_revise` | 用户要求修改时；必须先 search 拿到 ID 与当前 revision |
| `mcp__butler__memory_archive` | 用户要求"忘掉"时；归档保留审计，不物理删除 |
| `mcp__butler__memory_candidates` | 查看框架推断、等待用户决定的候选 |
| `mcp__butler__memory_candidate_accept` / `_reject` | 仅当用户明确批准/拒绝候选时调用 |

## 硬规则

1. **绝不静默写入**：只有用户明确要求（"记住…"、"以后默认…"）才调用写工具；
   不推断、不主动"顺便"保存。
2. **改/删前先查**：revise/archive 必须携带 `memory_id` 与 `expected_revision`，
   未知时先 `memory_search`。收到 `revision_conflict` 就重新查询，不要盲目重试。
3. **不属于记忆的内容**：称呼、语言、语气、回复长度、排版偏好是 Persona
   字段，**不要**用 `memory_create` 保存；直接确认用户要求即可。
4. **隐私封顶**：模型写入面只有 public/internal；`memory_search` 天然不返回
   private/secret，永远不要尝试读取或写入更高敏感度内容。
5. **候选即待决**：推断事实以候选存在，绝不自行 `candidate_accept`；
   除非用户明确说"接受这条"，否则只展示。

## 失败处理

- `revision_conflict`：向用户说明记忆已被修改，重新 search 后请求确认；
- `resource_not_found`：记忆可能已被归档，重新 list/search；
- `memory_access_denied`：桥设备缺少 scope，提示部署者检查
  `ai-butler-admin grant-scopes`。
