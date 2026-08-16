window.__ModuleLoader__.load({ id: "dsh-butler-memory", factory: function (require) { var module = { exports: {} }; var exports = module.exports; Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/src/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react2 = require("react");

// client/src/MemoryPanel.tsx
var import_react = require("react");

// client/src/hostClient.ts
var rpc = null;
function setRpc(caller) {
  rpc = caller;
}
async function hostCall(endpoint, payload) {
  if (rpc === null) {
    throw new Error("dsh-butler-memory: connection RPC is not available");
  }
  const result = await rpc.call("/butler-memory", endpoint, payload ?? {});
  if (!result.ok) {
    throw new Error(result.error?.message ?? "butler-memory RPC failed");
  }
  return result.value;
}

// client/src/MemoryPanel.tsx
var KIND_LABELS = {
  fact: "\u4E8B\u5B9E",
  preference: "\u504F\u597D",
  project: "\u9879\u76EE",
  routine: "\u65E5\u5E38",
  episode: "\u60C5\u666F",
  other: "\u5176\u4ED6"
};
var SENSITIVITY_LABELS = {
  public: "\u516C\u5F00",
  internal: "\u5185\u90E8",
  private: "\u79C1\u5BC6",
  secret: "\u673A\u5BC6"
};
function badge(label, tone) {
  return (0, import_react.createElement)("span", { className: `bm-badge bm-badge--${tone}` }, label);
}
function shortId(value) {
  return value.slice(0, 8);
}
function MemoryRow({ memory, onOpen }) {
  return (0, import_react.createElement)(
    "div",
    { className: "bm-item" },
    (0, import_react.createElement)(
      "button",
      { type: "button", className: "bm-item__main", onClick: onOpen },
      (0, import_react.createElement)(
        "div",
        { className: "bm-item__title" },
        memory.summary ?? memory.content.slice(0, 80),
        badge(KIND_LABELS[memory.kind] ?? memory.kind, "kind"),
        badge(SENSITIVITY_LABELS[memory.sensitivity] ?? memory.sensitivity, "sensitivity"),
        memory.status === "archived" ? badge("\u5DF2\u5F52\u6863", "archived") : null
      ),
      (0, import_react.createElement)(
        "div",
        { className: "bm-item__meta" },
        `#${memory.memory_id.slice(0, 8)} \xB7 revision ${memory.revision} \xB7 \u66F4\u65B0 ${memory.updated_at.slice(0, 16).replace("T", " ")}`
      )
    )
  );
}
function CandidateRow({
  candidate,
  onDecision
}) {
  return (0, import_react.createElement)(
    "div",
    { className: "bm-item" },
    (0, import_react.createElement)(
      "div",
      { className: "bm-item__title" },
      candidate.summary ?? candidate.content.slice(0, 80),
      badge(KIND_LABELS[candidate.kind] ?? candidate.kind, "kind"),
      badge("\u5019\u9009", "candidate")
    ),
    (0, import_react.createElement)("div", { className: "bm-item__meta" }, candidate.policy_reason),
    (0, import_react.createElement)(
      "div",
      { className: "bm-item__actions" },
      (0, import_react.createElement)(
        "button",
        {
          type: "button",
          className: "bm-action bm-action--accept",
          onClick: () => onDecision(candidate.candidate_id, true)
        },
        "\u63A5\u53D7"
      ),
      (0, import_react.createElement)(
        "button",
        {
          type: "button",
          className: "bm-action bm-action--reject",
          onClick: () => onDecision(candidate.candidate_id, false)
        },
        "\u62D2\u7EDD"
      )
    )
  );
}
function MemoryPanel({ onClose }) {
  const [view, setView] = (0, import_react.useState)("memories");
  const [memories, setMemories] = (0, import_react.useState)([]);
  const [candidates, setCandidates] = (0, import_react.useState)([]);
  const [includeArchived, setIncludeArchived] = (0, import_react.useState)(false);
  const [expanded, setExpanded] = (0, import_react.useState)(null);
  const [revisions, setRevisions] = (0, import_react.useState)(null);
  const [healthy, setHealthy] = (0, import_react.useState)(null);
  const [showGuide, setShowGuide] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const load = (0, import_react.useMemo)(
    () => () => {
      setError(null);
      Promise.all([
        hostCall("memory/health", {}).catch(() => ({ ok: false })),
        hostCall("memory/list", { limit: 50, include_archived: includeArchived }).catch(
          (cause) => {
            throw cause;
          }
        ),
        hostCall("memory/candidates", { status: "pending", limit: 50 }).catch(
          () => ({ candidates: [] })
        )
      ]).then(([healthResult, memoryResult, candidateResult]) => {
        setHealthy(healthResult.ok);
        setMemories(memoryResult.memories ?? []);
        setCandidates(candidateResult.candidates ?? []);
      }).catch((cause) => {
        setHealthy(false);
        setShowGuide(true);
        setError(cause instanceof Error ? cause.message : String(cause));
      });
    },
    [includeArchived]
  );
  (0, import_react.useEffect)(() => {
    load();
  }, [load]);
  function openDetail(memory) {
    setExpanded(memory);
    setRevisions(null);
    hostCall("memory/revisions", { memoryId: memory.memory_id }).then((result) => {
      setRevisions(result.revisions ?? []);
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  }
  function decide(candidateId, accept) {
    const endpoint = accept ? "memory/candidates/accept" : "memory/candidates/reject";
    hostCall(endpoint, { candidateId }).then(() => load()).catch((cause) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  }
  return (0, import_react.createElement)(
    "div",
    { className: "bm-overlay", role: "dialog", "aria-label": "\u5206\u5C42\u8BB0\u5FC6" },
    (0, import_react.createElement)(
      "div",
      { className: "bm-panel" },
      (0, import_react.createElement)(
        "div",
        { className: "bm-panel__header" },
        (0, import_react.createElement)("h2", null, "\u5206\u5C42\u8BB0\u5FC6"),
        (0, import_react.createElement)(
          "button",
          { type: "button", className: "bm-close", onClick: onClose, "aria-label": "\u5173\u95ED" },
          "\xD7"
        )
      ),
      (0, import_react.createElement)(
        "div",
        { className: "bm-tabs" },
        (0, import_react.createElement)(
          "button",
          {
            type: "button",
            className: view === "memories" ? "bm-tab bm-tab--active" : "bm-tab",
            onClick: () => setView("memories")
          },
          "\u5DF2\u4FDD\u5B58\u8BB0\u5FC6"
        ),
        (0, import_react.createElement)(
          "button",
          {
            type: "button",
            className: view === "candidates" ? "bm-tab bm-tab--active" : "bm-tab",
            onClick: () => setView("candidates")
          },
          `\u8BB0\u5FC6\u5019\u9009 (${candidates.length})`
        )
      ),
      (0, import_react.createElement)(
        "div",
        { className: "bm-status-row" },
        healthy === null ? (0, import_react.createElement)("span", { className: "bm-status bm-status--pending" }, "\u68C0\u67E5\u670D\u52A1\u2026") : healthy ? (0, import_react.createElement)(
          "span",
          { className: "bm-status bm-status--ok" },
          "Butler \u8BB0\u5FC6\u670D\u52A1\u5728\u7EBF"
        ) : (0, import_react.createElement)(
          "span",
          { className: "bm-status bm-status--down" },
          "\u8BB0\u5FC6\u670D\u52A1\u79BB\u7EBF"
        ),
        healthy === false ? (0, import_react.createElement)(
          "button",
          {
            type: "button",
            className: "bm-action bm-action--guide",
            onClick: () => setShowGuide((value) => !value)
          },
          showGuide ? "\u6536\u8D77\u5B89\u88C5\u6307\u5F15" : "\u67E5\u770B\u5B89\u88C5\u6307\u5F15"
        ) : null
      ),
      showGuide && healthy === false ? (0, import_react.createElement)(
        "div",
        { className: "bm-guide" },
        (0, import_react.createElement)("div", { className: "bm-guide__step" }, "1. \u5B89\u88C5\u5E76\u914D\u7F6E MCP \u670D\u52A1\u5668\uFF1A"),
        (0, import_react.createElement)("code", { className: "bm-guide__code" }, "pip install butler-memory-mcp"),
        (0, import_react.createElement)("div", { className: "bm-guide__step" }, "2. \u914D\u7F6E\u73AF\u5883\uFF08\u4E09\u9009\u4E00\u4F4D\u7F6E\u5747\u53EF\uFF09\uFF1A"),
        (0, import_react.createElement)(
          "code",
          { className: "bm-guide__code" },
          "cp .env.example ~/.config/butler-memory-mcp/.env  # \u586B DATABASE_URL / USER_ID / DEVICE_ID"
        ),
        (0, import_react.createElement)("div", { className: "bm-guide__step" }, "3. \u6CE8\u518C\u6865\u8BBE\u5907\uFF08\u53EA\u9700\u4E00\u6B21\uFF09\uFF1A"),
        (0, import_react.createElement)(
          "code",
          { className: "bm-guide__code" },
          "ai-butler-admin add-device --user-id <USER_UUID> --device-name dsh-agent --device-kind agent --scope memory:read --scope memory:write"
        ),
        (0, import_react.createElement)("div", { className: "bm-guide__step" }, "4. \u542F\u52A8\u9762\u677F\u670D\u52A1\uFF1A"),
        (0, import_react.createElement)(
          "code",
          { className: "bm-guide__code" },
          "ai-butler-memory-mcp --transport http"
        ),
        (0, import_react.createElement)(
          "div",
          { className: "bm-guide__note" },
          "\u672C\u9762\u677F\u4E0D\u4F1A\u4EE3\u4F60\u6267\u884C\u5B89\u88C5\u6216\u4FEE\u6539\u914D\u7F6E\u2014\u2014Secret \u4E0E\u8BBE\u5907\u6CE8\u518C\u5F52\u4F60\u6240\u6709\u3002"
        )
      ) : null,
      error ? (0, import_react.createElement)("div", { className: "bm-error" }, error) : null,
      view === "memories" ? (0, import_react.createElement)(
        "div",
        { className: "bm-scroll" },
        (0, import_react.createElement)(
          "label",
          { className: "bm-toggle" },
          (0, import_react.createElement)("input", {
            type: "checkbox",
            checked: includeArchived,
            onChange: (event) => setIncludeArchived(event.target.checked)
          }),
          "\u663E\u793A\u5DF2\u5F52\u6863"
        ),
        memories.length === 0 ? (0, import_react.createElement)("p", { className: "bm-empty" }, "\u5C1A\u672A\u8BFB\u53D6\u8BB0\u5FC6\u3002") : memories.map(
          (memory) => (0, import_react.createElement)(MemoryRow, {
            key: memory.memory_id,
            memory,
            onOpen: () => openDetail(memory)
          })
        ),
        expanded ? (0, import_react.createElement)(
          "div",
          { className: "bm-detail" },
          (0, import_react.createElement)(
            "div",
            { className: "bm-detail__meta" },
            `#${shortId(expanded.memory_id)} \xB7 revision ${expanded.revision} \xB7 ${SENSITIVITY_LABELS[expanded.sensitivity] ?? expanded.sensitivity}`
          ),
          (0, import_react.createElement)("p", null, expanded.content),
          (0, import_react.createElement)("div", { className: "bm-detail__sub" }, "\u4FEE\u8BA2\u5386\u53F2"),
          revisions === null ? (0, import_react.createElement)("div", { className: "bm-item__meta" }, "\u8BFB\u53D6\u4E2D\u2026") : revisions.map(
            (revision) => (0, import_react.createElement)(
              "div",
              { key: revision.revision, className: "bm-revision" },
              (0, import_react.createElement)(
                "span",
                { className: "bm-revision__badge" },
                `r${revision.revision}`
              ),
              (0, import_react.createElement)(
                "span",
                { className: "bm-revision__body" },
                revision.reason
              ),
              (0, import_react.createElement)(
                "span",
                { className: "bm-revision__meta" },
                `${revision.created_at.slice(0, 16).replace("T", " ")} \xB7 ${revision.actor_device_id ? `\u8BBE\u5907 ${shortId(revision.actor_device_id)}` : "\u7CFB\u7EDF"}`
              )
            )
          ),
          (0, import_react.createElement)(
            "button",
            {
              type: "button",
              className: "bm-action",
              onClick: () => {
                setExpanded(null);
                setRevisions(null);
              }
            },
            "\u6536\u8D77"
          )
        ) : null
      ) : (0, import_react.createElement)(
        "div",
        { className: "bm-scroll" },
        candidates.length === 0 ? (0, import_react.createElement)(
          "p",
          { className: "bm-empty" },
          "\u6CA1\u6709\u5F85\u51B3\u5B9A\u7684\u5019\u9009\u3002\u63A8\u65AD\u4E8B\u5B9E\u4E0D\u4F1A\u9759\u9ED8\u6210\u4E3A\u957F\u671F\u8BB0\u5FC6\u3002"
        ) : candidates.map(
          (candidate) => (0, import_react.createElement)(CandidateRow, {
            key: candidate.candidate_id,
            candidate,
            onDecision: decide
          })
        )
      ),
      (0, import_react.createElement)(
        "div",
        { className: "bm-footer" },
        (0, import_react.createElement)(
          "button",
          { type: "button", className: "bm-action", onClick: load },
          "\u5237\u65B0"
        ),
        (0, import_react.createElement)("span", { className: "bm-note" }, "\u6570\u636E\u6765\u81EA\u672C\u5730 Butler \u8BB0\u5FC6\u670D\u52A1")
      )
    )
  );
}

// client/src/index.tsx
var name = "dsh-butler-memory-panel";
var inject = ["connection", "slots"];
function MemoryButton() {
  const [open, setOpen] = (0, import_react2.useState)(false);
  return (0, import_react2.createElement)(
    "span",
    null,
    (0, import_react2.createElement)(
      "button",
      {
        type: "button",
        className: "bm-trigger",
        title: "\u67E5\u770B\u957F\u671F\u8BB0\u5FC6",
        onClick: () => setOpen((value) => !value)
      },
      "\u8BB0\u5FC6"
    ),
    open ? (0, import_react2.createElement)(MemoryPanel, { onClose: () => setOpen(false) }) : null
  );
}
function apply(ctx) {
  setRpc(ctx.connection.rpc);
  installStyles();
  ctx.slots.inject(
    "conversation.session.header.actions",
    () => ctx.slots.register(
      {
        name: "conversation.session.header.actions",
        id: "butler-memory",
        order: 30
      },
      MemoryButton
    )
  );
}
function installStyles() {
  if (typeof document === "undefined" || document.getElementById("bm-memory-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "bm-memory-styles";
  style.textContent = `
    .bm-trigger{min-height:28px;padding:0 8px;border:0;background:0;border-radius:6px;
      color:var(--dsw-alias-label-tertiary,#9a9ba1);font-size:13px;line-height:28px;cursor:pointer;}
    .bm-trigger:hover{color:var(--dsw-alias-label-secondary,#c9cad0);
      background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));}
    .bm-overlay{position:fixed;inset:0;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.55));display:flex;
      align-items:flex-start;justify-content:flex-end;z-index:1000;padding:48px 24px 24px;}
    .bm-panel{width:400px;max-width:100%;max-height:78vh;display:flex;flex-direction:column;
      overflow:hidden;border-radius:12px;border:1px solid var(--dsw-alias-border-l2,#33353a);
      background:var(--dsw-specific-menu,var(--dsw-alias-bg-overlay,#1f2023));
      color:var(--dsw-alias-label-primary,#e8e8ea);font-size:13px;
      box-shadow:0 12px 32px rgba(0,0,0,.4);}
    .bm-panel__header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 10px;}
    .bm-panel__header h2{margin:0;font-size:15px;font-weight:600;
      color:var(--dsw-alias-label-primary,#e8e8ea);}
    .bm-close{border:none;background:none;color:var(--dsw-alias-label-tertiary,#9a9ba1);
      font-size:20px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px;}
    .bm-close:hover{color:var(--dsw-alias-label-primary,#e8e8ea);
      background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));}
    .bm-tabs{display:flex;gap:4px;margin:0 16px 10px;
      border-bottom:1px solid var(--dsw-alias-border-l2,#33353a);}
    .bm-tab{border:none;background:none;color:var(--dsw-alias-label-tertiary,#9a9ba1);
      padding:6px 12px;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;}
    .bm-tab:hover{color:var(--dsw-alias-label-secondary,#c9cad0);}
    .bm-tab--active{color:var(--dsw-alias-label-primary,#e8e8ea);font-weight:500;
      border-bottom-color:var(--dsw-alias-brand-primary,#4f7cff);}
    .bm-scroll{overflow-y:auto;padding:0 16px 12px;display:flex;flex-direction:column;gap:8px;}
    .bm-item{border:1px solid var(--dsw-alias-border-l2,#33353a);border-radius:8px;padding:10px 12px;
      background:var(--dsw-alias-bg-layer-1,transparent);}
    .bm-item:hover{border-color:var(--dsw-alias-border-l3,#4a4c53);}
    .bm-item__main{border:none;background:none;text-align:left;cursor:pointer;width:100%;padding:0;
      color:inherit;font:inherit;}
    .bm-item__title{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-weight:500;
      color:var(--dsw-alias-label-primary,#e8e8ea);}
    .bm-item__meta{color:var(--dsw-alias-label-caption,#8b8d94);font-size:11px;margin-top:5px;
      font-family:var(--dsw-font-mono,ui-monospace,monospace);}
    .bm-item__actions{display:flex;gap:8px;margin-top:8px;}
    .bm-badge{border-radius:999px;padding:1px 8px;font-size:11px;line-height:16px;
      color:var(--dsw-alias-label-secondary,#c9cad0);
      background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));
      border:1px solid var(--dsw-alias-border-l2,#33353a);}
    .bm-badge--archived{color:var(--dsw-alias-label-tertiary,#9a9ba1);}
    .bm-action{border:1px solid var(--dsw-alias-border-l2,#33353a);border-radius:6px;
      background:var(--dsw-alias-button-tool-bar-fill,transparent);
      color:var(--dsw-alias-label-primary,#e8e8ea);padding:4px 12px;cursor:pointer;font-size:12px;}
    .bm-action:hover{background:var(--dsw-alias-button-tool-bar-hover,rgba(255,255,255,.08));}
    .bm-action--accept{color:var(--dsw-alias-brand-text,#8ab4ff);}
    .bm-action--accept:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));}
    .bm-action--reject:hover{background:var(--dsw-alias-interactive-bg-hover-danger,rgba(232,93,84,.16));}
    .bm-error{color:var(--dsw-alias-label-primary,#e8e8ea);font-size:12px;border-radius:8px;
      background:var(--dsw-alias-interactive-bg-hover-danger,rgba(232,93,84,.16));
      border:1px solid rgba(232,93,84,.35);padding:8px 12px;margin:0 16px 10px;}
    .bm-empty{color:var(--dsw-alias-label-tertiary,#9a9ba1);text-align:center;margin:20px 0;font-size:12px;}
    .bm-toggle{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary,#c9cad0);
      font-size:12px;cursor:pointer;padding:4px 2px;user-select:none;}
    .bm-toggle input{accent-color:var(--dsw-alias-brand-primary,#4f7cff);}
    .bm-detail{margin-top:8px;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));
      border-radius:8px;padding:10px 12px;color:var(--dsw-alias-label-secondary,#c9cad0);
      white-space:pre-wrap;font-size:12px;line-height:1.6;}
    .bm-detail__meta{color:var(--dsw-alias-label-caption,#8b8d94);font-size:11px;
      font-family:var(--dsw-font-mono,ui-monospace,monospace);margin-bottom:6px;white-space:normal;}
    .bm-detail__sub{color:var(--dsw-alias-label-tertiary,#9a9ba1);font-size:11px;
      margin:10px 0 6px;white-space:normal;}
    .bm-revision{display:flex;gap:8px;align-items:baseline;padding:4px 0;white-space:normal;
      border-top:1px dashed var(--dsw-alias-border-l2,#33353a);}
    .bm-revision__badge{flex:none;color:var(--dsw-alias-brand-text,#8ab4ff);
      font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:11px;}
    .bm-revision__body{flex:1;color:var(--dsw-alias-label-secondary,#c9cad0);white-space:normal;}
    .bm-revision__meta{flex:none;color:var(--dsw-alias-label-caption,#8b8d94);font-size:10px;
      font-family:var(--dsw-font-mono,ui-monospace,monospace);white-space:normal;}
    .bm-status-row{display:flex;align-items:center;gap:10px;margin:0 16px 10px;}
    .bm-status{font-size:12px;display:inline-flex;align-items:center;gap:6px;}
    .bm-status::before{content:"";width:7px;height:7px;border-radius:50%;display:inline-block;}
    .bm-status--pending::before{background:var(--dsw-alias-label-tertiary,#9a9ba1);}
    .bm-status--ok{color:var(--dsw-alias-label-secondary,#c9cad0);}
    .bm-status--ok::before{background:#4cc38a;}
    .bm-status--down{color:var(--dsw-alias-label-secondary,#c9cad0);}
    .bm-status--down::before{background:#e8605c;}
    .bm-action--guide{font-size:11px;padding:2px 10px;}
    .bm-guide{margin:0 16px 10px;border:1px solid var(--dsw-alias-border-l2,#33353a);
      border-radius:8px;padding:10px 12px;background:var(--dsw-alias-bg-layer-1,transparent);
      display:flex;flex-direction:column;gap:6px;}
    .bm-guide__step{color:var(--dsw-alias-label-secondary,#c9cad0);font-size:12px;}
    .bm-guide__code{display:block;color:var(--dsw-alias-label-primary,#e8e8ea);font-size:11px;
      font-family:var(--dsw-font-mono,ui-monospace,monospace);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));
      border-radius:6px;padding:6px 8px;white-space:pre-wrap;word-break:break-all;}
    .bm-guide__note{color:var(--dsw-alias-label-caption,#8b8d94);font-size:11px;}
    .bm-footer{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;
      border-top:1px solid var(--dsw-alias-border-l2,#33353a);}
    .bm-note{color:var(--dsw-alias-label-caption,#8b8d94);font-size:11px;}
  `;
  document.head.append(style);
}
return module.exports; } });
