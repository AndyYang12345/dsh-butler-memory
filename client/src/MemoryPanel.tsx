/**
 * 分层记忆面板 — ported semantics of the ai-butler-framework Web memory
 * dialog (web/index.html `memoryDialog` / app.js render helpers), re-rendered
 * as a DSH client overlay. Data comes from the loopback panel API through the
 * package-private host.call channel; the agent-facing MCP tools stay separate.
 */
import { createElement, useEffect, useMemo, useState } from 'react'
import { hostCall } from './hostClient'

const KIND_LABELS: Record<string, string> = {
  fact: '事实',
  preference: '偏好',
  project: '项目',
  routine: '日常',
  episode: '情景',
  other: '其他',
}

const SENSITIVITY_LABELS: Record<string, string> = {
  public: '公开',
  internal: '内部',
  private: '私密',
  secret: '机密',
}

interface MemoryRecord {
  memory_id: string
  kind: string
  sensitivity: string
  status: string
  summary: string | null
  content: string
  revision: number
  created_at: string
  updated_at: string
}

interface CandidateRecord {
  candidate_id: string
  kind: string
  status: string
  content: string
  summary: string | null
  policy_reason: string
}

type View = 'memories' | 'candidates'

function badge(label: string, tone: string) {
  return createElement('span', { className: `bm-badge bm-badge--${tone}` }, label)
}

function MemoryRow({ memory, onOpen }: { memory: MemoryRecord; onOpen: () => void }) {
  return createElement(
    'div',
    { className: 'bm-item' },
    createElement(
      'button',
      { type: 'button', className: 'bm-item__main', onClick: onOpen },
      createElement(
        'div',
        { className: 'bm-item__title' },
        memory.summary ?? memory.content.slice(0, 80),
        badge(KIND_LABELS[memory.kind] ?? memory.kind, 'kind'),
        badge(SENSITIVITY_LABELS[memory.sensitivity] ?? memory.sensitivity, 'sensitivity'),
        memory.status === 'archived' ? badge('已归档', 'archived') : null,
      ),
      createElement(
        'div',
        { className: 'bm-item__meta' },
        `revision ${memory.revision} · 更新 ${memory.updated_at.slice(0, 16).replace('T', ' ')}`,
      ),
    ),
  )
}

function CandidateRow({
  candidate,
  onDecision,
}: {
  candidate: CandidateRecord
  onDecision: (candidateId: string, accept: boolean) => void
}) {
  return createElement(
    'div',
    { className: 'bm-item' },
    createElement(
      'div',
      { className: 'bm-item__title' },
      candidate.summary ?? candidate.content.slice(0, 80),
      badge(KIND_LABELS[candidate.kind] ?? candidate.kind, 'kind'),
      badge('候选', 'candidate'),
    ),
    createElement('div', { className: 'bm-item__meta' }, candidate.policy_reason),
    createElement(
      'div',
      { className: 'bm-item__actions' },
      createElement(
        'button',
        {
          type: 'button',
          className: 'bm-action bm-action--accept',
          onClick: () => onDecision(candidate.candidate_id, true),
        },
        '接受',
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: 'bm-action bm-action--reject',
          onClick: () => onDecision(candidate.candidate_id, false),
        },
        '拒绝',
      ),
    ),
  )
}

interface MemoryPanelProps {
  onClose: () => void
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const [view, setView] = useState<View>('memories')
  const [memories, setMemories] = useState<MemoryRecord[]>([])
  const [candidates, setCandidates] = useState<CandidateRecord[]>([])
  const [expanded, setExpanded] = useState<MemoryRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useMemo(
    () => () => {
      setError(null)
      Promise.all([
        hostCall('butler-memory.list', { limit: 50 }).catch((cause) => {
          throw cause
        }),
        hostCall('butler-memory.candidates', { status: 'pending', limit: 50 }).catch(
          () => ({ candidates: [] }),
        ),
      ])
        .then(([memoryResult, candidateResult]) => {
          setMemories((memoryResult as { memories: MemoryRecord[] }).memories ?? [])
          setCandidates((candidateResult as { candidates: CandidateRecord[] }).candidates ?? [])
        })
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : String(cause))
        })
    },
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  function decide(candidateId: string, accept: boolean) {
    const method = accept ? 'butler-memory.acceptCandidate' : 'butler-memory.rejectCandidate'
    hostCall(method, { candidateId })
      .then(() => load())
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
  }

  return createElement(
    'div',
    { className: 'bm-overlay', role: 'dialog', 'aria-label': '分层记忆' },
    createElement(
      'div',
      { className: 'bm-panel' },
      createElement(
        'div',
        { className: 'bm-panel__header' },
        createElement('h2', null, '分层记忆'),
        createElement(
          'button',
          { type: 'button', className: 'bm-close', onClick: onClose, 'aria-label': '关闭' },
          '×',
        ),
      ),
      createElement(
        'div',
        { className: 'bm-tabs' },
        createElement(
          'button',
          {
            type: 'button',
            className: view === 'memories' ? 'bm-tab bm-tab--active' : 'bm-tab',
            onClick: () => setView('memories'),
          },
          '已保存记忆',
        ),
        createElement(
          'button',
          {
            type: 'button',
            className: view === 'candidates' ? 'bm-tab bm-tab--active' : 'bm-tab',
            onClick: () => setView('candidates'),
          },
          `记忆候选 (${candidates.length})`,
        ),
      ),
      error ? createElement('div', { className: 'bm-error' }, error) : null,
      view === 'memories'
        ? createElement(
            'div',
            { className: 'bm-list' },
            memories.length === 0
              ? createElement('p', { className: 'bm-empty' }, '尚未读取记忆。')
              : memories.map((memory) =>
                  createElement(MemoryRow, {
                    key: memory.memory_id,
                    memory,
                    onOpen: () => setExpanded(memory),
                  }),
                ),
            expanded
              ? createElement(
                  'div',
                  { className: 'bm-detail' },
                  createElement('p', null, expanded.content),
                  createElement(
                    'button',
                    { type: 'button', className: 'bm-action', onClick: () => setExpanded(null) },
                    '收起',
                  ),
                )
              : null,
          )
        : createElement(
            'div',
            { className: 'bm-list' },
            candidates.length === 0
              ? createElement(
                  'p',
                  { className: 'bm-empty' },
                  '没有待决定的候选。推断事实不会静默成为长期记忆。',
                )
              : candidates.map((candidate) =>
                  createElement(CandidateRow, {
                    key: candidate.candidate_id,
                    candidate,
                    onDecision: decide,
                  }),
                ),
          ),
      createElement(
        'div',
        { className: 'bm-footer' },
        createElement(
          'button',
          { type: 'button', className: 'bm-action', onClick: load },
          '刷新',
        ),
        createElement('span', { className: 'bm-note' }, '数据来自本地 Butler 记忆服务'),
      ),
    ),
  )
}
