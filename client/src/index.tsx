/**
 * Browser half: seats a "记忆" button into the session header action row and
 * opens the memory panel dialog.
 *
 * Slot contract (verified in the DSH repo):
 *   'conversation.session.header.actions' — kind 'list', scope 'session',
 *   owner ConversationHeaderActionOwnerProps, rendered by ascending `order`.
 *
 * VERIFY-STEP (first integration): confirm the exact SlotCore.register entry
 * shape ({ component?, order? }) and the `host` service accessor for static
 * client packages with `cordis_inspect_list` / `cordis_inspect_query` before
 * activating. The host.call pairing is official; the injection spelling here
 * is the documented static-plugin form and must be checked against the live
 * catalog.
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
  ctx.slots.register('conversation.session.header.actions', {
    order: 100,
    component: MemoryButton,
  })
}

/** Minimal self-contained styles; no CDN, no build-time CSS pipeline. */
function installStyles() {
  if (typeof document === 'undefined' || document.getElementById('bm-memory-styles')) {
    return
  }
  const style = document.createElement('style')
  style.id = 'bm-memory-styles'
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
  `
  document.head.append(style)
}
