// client/src/index.tsx
import { createElement as createElement2, useState as useState2 } from "react";

// client/src/MemoryPanel.tsx
import { createElement, useEffect, useMemo, useState } from "react";

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
  return createElement("span", { className: `bm-badge bm-badge--${tone}` }, label);
}
function MemoryRow({ memory, onOpen }) {
  return createElement(
    "div",
    { className: "bm-item" },
    createElement(
      "button",
      { type: "button", className: "bm-item__main", onClick: onOpen },
      createElement(
        "div",
        { className: "bm-item__title" },
        memory.summary ?? memory.content.slice(0, 80),
        badge(KIND_LABELS[memory.kind] ?? memory.kind, "kind"),
        badge(SENSITIVITY_LABELS[memory.sensitivity] ?? memory.sensitivity, "sensitivity"),
        memory.status === "archived" ? badge("\u5DF2\u5F52\u6863", "archived") : null
      ),
      createElement(
        "div",
        { className: "bm-item__meta" },
        `revision ${memory.revision} \xB7 \u66F4\u65B0 ${memory.updated_at.slice(0, 16).replace("T", " ")}`
      )
    )
  );
}
function CandidateRow({
  candidate,
  onDecision
}) {
  return createElement(
    "div",
    { className: "bm-item" },
    createElement(
      "div",
      { className: "bm-item__title" },
      candidate.summary ?? candidate.content.slice(0, 80),
      badge(KIND_LABELS[candidate.kind] ?? candidate.kind, "kind"),
      badge("\u5019\u9009", "candidate")
    ),
    createElement("div", { className: "bm-item__meta" }, candidate.policy_reason),
    createElement(
      "div",
      { className: "bm-item__actions" },
      createElement(
        "button",
        {
          type: "button",
          className: "bm-action bm-action--accept",
          onClick: () => onDecision(candidate.candidate_id, true)
        },
        "\u63A5\u53D7"
      ),
      createElement(
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
  const [view, setView] = useState("memories");
  const [memories, setMemories] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);
  const load = useMemo(
    () => () => {
      setError(null);
      Promise.all([
        hostCall("memory/list", { limit: 50 }).catch((cause) => {
          throw cause;
        }),
        hostCall("memory/candidates", { status: "pending", limit: 50 }).catch(
          () => ({ candidates: [] })
        )
      ]).then(([memoryResult, candidateResult]) => {
        setMemories(memoryResult.memories ?? []);
        setCandidates(candidateResult.candidates ?? []);
      }).catch((cause) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      });
    },
    []
  );
  useEffect(() => {
    load();
  }, [load]);
  function decide(candidateId, accept) {
    const endpoint = accept ? "memory/candidates/accept" : "memory/candidates/reject";
    hostCall(endpoint, { candidateId }).then(() => load()).catch((cause) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  }
  return createElement(
    "div",
    { className: "bm-overlay", role: "dialog", "aria-label": "\u5206\u5C42\u8BB0\u5FC6" },
    createElement(
      "div",
      { className: "bm-panel" },
      createElement(
        "div",
        { className: "bm-panel__header" },
        createElement("h2", null, "\u5206\u5C42\u8BB0\u5FC6"),
        createElement(
          "button",
          { type: "button", className: "bm-close", onClick: onClose, "aria-label": "\u5173\u95ED" },
          "\xD7"
        )
      ),
      createElement(
        "div",
        { className: "bm-tabs" },
        createElement(
          "button",
          {
            type: "button",
            className: view === "memories" ? "bm-tab bm-tab--active" : "bm-tab",
            onClick: () => setView("memories")
          },
          "\u5DF2\u4FDD\u5B58\u8BB0\u5FC6"
        ),
        createElement(
          "button",
          {
            type: "button",
            className: view === "candidates" ? "bm-tab bm-tab--active" : "bm-tab",
            onClick: () => setView("candidates")
          },
          `\u8BB0\u5FC6\u5019\u9009 (${candidates.length})`
        )
      ),
      error ? createElement("div", { className: "bm-error" }, error) : null,
      view === "memories" ? createElement(
        "div",
        { className: "bm-list" },
        memories.length === 0 ? createElement("p", { className: "bm-empty" }, "\u5C1A\u672A\u8BFB\u53D6\u8BB0\u5FC6\u3002") : memories.map(
          (memory) => createElement(MemoryRow, {
            key: memory.memory_id,
            memory,
            onOpen: () => setExpanded(memory)
          })
        ),
        expanded ? createElement(
          "div",
          { className: "bm-detail" },
          createElement("p", null, expanded.content),
          createElement(
            "button",
            { type: "button", className: "bm-action", onClick: () => setExpanded(null) },
            "\u6536\u8D77"
          )
        ) : null
      ) : createElement(
        "div",
        { className: "bm-list" },
        candidates.length === 0 ? createElement(
          "p",
          { className: "bm-empty" },
          "\u6CA1\u6709\u5F85\u51B3\u5B9A\u7684\u5019\u9009\u3002\u63A8\u65AD\u4E8B\u5B9E\u4E0D\u4F1A\u9759\u9ED8\u6210\u4E3A\u957F\u671F\u8BB0\u5FC6\u3002"
        ) : candidates.map(
          (candidate) => createElement(CandidateRow, {
            key: candidate.candidate_id,
            candidate,
            onDecision: decide
          })
        )
      ),
      createElement(
        "div",
        { className: "bm-footer" },
        createElement(
          "button",
          { type: "button", className: "bm-action", onClick: load },
          "\u5237\u65B0"
        ),
        createElement("span", { className: "bm-note" }, "\u6570\u636E\u6765\u81EA\u672C\u5730 Butler \u8BB0\u5FC6\u670D\u52A1")
      )
    )
  );
}

// client/src/index.tsx
var name = "dsh-butler-memory-panel";
var inject = ["connection", "slots"];
function MemoryButton() {
  const [open, setOpen] = useState2(false);
  return createElement2(
    "span",
    null,
    createElement2(
      "button",
      {
        type: "button",
        title: "\u67E5\u770B\u957F\u671F\u8BB0\u5FC6",
        onClick: () => setOpen((value) => !value)
      },
      "\u8BB0\u5FC6"
    ),
    open ? createElement2(MemoryPanel, { onClose: () => setOpen(false) }) : null
  );
}
function apply(ctx) {
  setRpc(ctx.connection.rpc);
  installStyles();
  ctx.slots.register("conversation.session.header.actions", {
    order: 100,
    component: MemoryButton
  });
}
function installStyles() {
  if (typeof document === "undefined" || document.getElementById("bm-memory-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "bm-memory-styles";
  style.textContent = `
    .bm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;
      align-items:flex-start;justify-content:flex-end;z-index:1000;padding:48px 24px 24px;}
    .bm-panel{width:420px;max-width:100%;max-height:80vh;overflow:auto;background:var(--ds-surface,#fff);
      border:1px solid var(--ds-border,#ddd);border-radius:10px;padding:14px 16px;font-size:13px;}
    .bm-panel__header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
    .bm-close{border:none;background:none;font-size:20px;cursor:pointer;}
    .bm-tabs{display:flex;gap:8px;margin-bottom:10px;}
    .bm-tab{border:1px solid var(--ds-border,#ddd);background:none;border-radius:6px;padding:4px 10px;cursor:pointer;}
    .bm-tab--active{background:var(--ds-accent,#e8f0fe);border-color:var(--ds-accent,#4a90d9);}
    .bm-list{display:flex;flex-direction:column;gap:6px;}
    .bm-item{border:1px solid var(--ds-border,#e2e2e2);border-radius:8px;padding:8px 10px;}
    .bm-item__main{border:none;background:none;text-align:left;cursor:pointer;width:100%;padding:0;}
    .bm-item__title{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-weight:600;}
    .bm-item__meta{color:#777;font-size:11px;margin-top:4px;}
    .bm-item__actions{display:flex;gap:8px;margin-top:6px;}
    .bm-badge{border-radius:999px;padding:1px 8px;font-size:10px;font-weight:500;}
    .bm-badge--kind{background:#eef1f6;color:#4b5563;}
    .bm-badge--sensitivity{background:#fdf2e9;color:#b45309;}
    .bm-badge--candidate{background:#fef9c3;color:#854d0e;}
    .bm-badge--archived{background:#f3f4f6;color:#6b7280;}
    .bm-action{border:1px solid var(--ds-border,#ddd);background:none;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:12px;}
    .bm-action--accept{background:#e6f6ec;border-color:#34a853;}
    .bm-action--reject{background:#fdecea;border-color:#ea4335;}
    .bm-error{color:#b42318;background:#fdecea;border-radius:6px;padding:6px 10px;margin-bottom:8px;}
    .bm-empty{color:#888;margin:12px 0;}
    .bm-detail{background:var(--ds-surface-2,#fafafa);border-radius:8px;padding:8px 10px;margin-top:8px;}
    .bm-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;}
    .bm-note{color:#999;font-size:11px;}
  `;
  document.head.append(style);
}
export {
  apply,
  inject,
  name
};
