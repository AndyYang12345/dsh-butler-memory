/**
 * Browser half: seats a "记忆" button into the session header action row and
 * opens the memory panel dialog.
 *
 * Slot contract (verified against the DSH runtime): the official
 * dsh-client-ui-jobs package registers the same
 * `conversation.session.header.actions` seat with
 *   ctx.slots.inject(key, () => ctx.slots.register({ name: key, id, order }, Component))
 * where `name` is the slot key, `id` the entry id, and `order` ranks entries
 * ascending. The component receives session-standard props; this one ignores
 * them.
 */
import { createElement, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { MemoryPanel } from './MemoryPanel'
import { setRpc } from './hostClient'

export const name = 'dsh-butler-memory-panel'

export const inject = ['connection', 'slots']

function MemoryButton() {
  const [open, setOpen] = useState(false)
  return createElement(
    'span',
    null,
    createElement(
      'button',
      {
        type: 'button',
        className: 'bm-trigger',
        title: '查看长期记忆',
        onClick: () => setOpen((value) => !value),
      },
      '记忆',
    ),
    open ? createElement(MemoryPanel, { onClose: () => setOpen(false) }) : null,
  )
}

export function apply(ctx: Context) {
  setRpc(ctx.connection.rpc)
  installStyles()
  ctx.slots.inject('conversation.session.header.actions', () =>
    ctx.slots.register(
      {
        name: 'conversation.session.header.actions',
        id: 'butler-memory',
        order: 30,
      },
      MemoryButton,
    ),
  )
}

/** Minimal self-contained styles; no CDN, no build-time CSS pipeline.
 *
 * Theme: only official DSW tokens (--dsw-*) with DARK fallbacks, so the
 * panel follows DSH's light/dark theme instead of fighting it. The previous
 * version used a nonexistent --ds-* prefix whose #fff fallback produced
 * white-on-white text on the dark theme.
 */
function installStyles() {
  if (typeof document === 'undefined' || document.getElementById('bm-memory-styles')) {
    return
  }
  const style = document.createElement('style')
  style.id = 'bm-memory-styles'
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
  `
  document.head.append(style)
}
