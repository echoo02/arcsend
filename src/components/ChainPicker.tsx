import { SOURCE_CHAINS, type SourceChain } from '@/lib/chains'

interface Props {
  value: SourceChain
  onChange: (chain: SourceChain) => void
  disabled?: boolean
}

export function ChainPicker({ value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="Source chain" className="grid grid-cols-4 gap-2">
      {SOURCE_CHAINS.map((chain) => {
        const selected = chain.id === value.id
        return (
          <button
            key={chain.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(chain)}
            title={chain.note}
            className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-all hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: selected ? 'var(--surface-strong)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selected ? 'var(--border-strong)' : 'var(--border)'}`,
              color: chain.kind === 'unsupported' ? 'var(--subtle)' : 'var(--ink-2)',
              outlineColor: 'var(--accent)',
            }}
          >
            <span className={chain.kind === 'unsupported' ? 'opacity-50 grayscale' : ''}>
              <chain.Icon variant="branded" size={24} />
            </span>
            <span className="leading-tight">{chain.label}</span>
          </button>
        )
      })}
    </div>
  )
}
