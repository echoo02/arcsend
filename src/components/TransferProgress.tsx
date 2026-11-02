import { Check, ExternalLink, Loader2 } from 'lucide-react'
import { STEP_ORDER, type Phase, type StepName, type TxLink } from '@/hooks/useBridge'

const LABELS: Record<StepName, (source: string) => string> = {
  approve: () => 'Approve USDC',
  burn: (source) => `Burn USDC on ${source}`,
  fetchAttestation: () => 'Circle signs the transfer',
  mint: () => 'Mint USDC on Arc',
}

interface Props {
  phase: Phase
  done: Set<StepName>
  links: TxLink[]
  sourceLabel: string
}

export function TransferProgress({ phase, done, links, sourceLabel }: Props) {
  const current = STEP_ORDER.find((s) => !done.has(s))
  const active = phase === 'preparing' || phase === 'running'

  return (
    <div className="glass-inner rounded-2xl p-4" aria-live="polite">
      <ol className="space-y-3">
        {STEP_ORDER.map((step) => {
          const isDone = done.has(step)
          const isCurrent = active && step === current
          const link = links.find((l) => l.step.toLowerCase() === step.toLowerCase())
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: isDone ? 'rgba(141,216,159,0.16)' : 'rgba(255,255,255,0.06)',
                  color: isDone ? 'var(--success)' : 'var(--subtle)',
                }}
              >
                {isDone ? <Check className="size-3.5" /> : isCurrent ? <Loader2 className="size-3.5 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span style={{ color: isDone || isCurrent ? 'var(--ink)' : 'var(--subtle)' }}>{LABELS[step](sourceLabel)}</span>
              {link?.url && (
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  View <ExternalLink className="size-3" />
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
