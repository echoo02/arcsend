import { Loader2 } from 'lucide-react'
import type { Estimate } from '@/hooks/useBridge'
import { Amount } from '@/onchain-money'
import { USDC_DECIMALS } from '@/onchain-facts'

interface Props {
  estimate?: Estimate
  loading: boolean
  failed: boolean
  gasSymbol?: string
  sourceLabel: string
}

function totalFees(estimate: Estimate): string | undefined {
  try {
    const amounts = estimate.fees.filter((f) => f.amount).map((f) => Amount.parse(f.amount as string, USDC_DECIMALS))
    return Amount.sum(amounts, USDC_DECIMALS).toFixed(4)
  } catch {
    return undefined
  }
}

export function FeePreview({ estimate, loading, failed, gasSymbol, sourceLabel }: Props) {
  const total = estimate ? totalFees(estimate) : undefined
  return (
    <div className="glass-inner space-y-2 rounded-2xl p-4 text-sm">
      <Row label="Network fees on Arc" value="Paid in USDC" />
      <Row
        label="Estimated fees"
        value={
          loading ? (
            <Loader2 className="size-4 animate-spin" aria-label="Estimating" />
          ) : total ? (
            `${total} USDC`
          ) : failed ? (
            'Unavailable'
          ) : (
            'Enter an amount'
          )
        }
      />
      {estimate?.fees.map((fee) =>
        fee.amount ? <Row key={fee.label} label={fee.label} value={`${fee.amount} USDC`} sub /> : null,
      )}
      <Row label="Speed" value="Fast transfer" />
      <p className="pt-1 text-xs leading-relaxed text-pretty" style={{ color: 'var(--subtle)' }}>
        Arc takes gas in USDC and Circle delivers the mint for you, so you never hold a gas token on Arc. Signing the
        burn on {sourceLabel} still needs a little {gasSymbol ?? 'native token'} for that chain's own gas.
      </p>
    </div>
  )
}

function Row({ label, value, sub }: { label: string; value: React.ReactNode; sub?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={sub ? 'pl-3 text-xs' : ''} style={{ color: sub ? 'var(--subtle)' : 'var(--muted)' }}>
        {label}
      </span>
      <span className={`tabular-nums ${sub ? 'text-xs' : 'font-medium'}`} style={{ color: sub ? 'var(--muted)' : 'var(--ink)' }}>
        {value}
      </span>
    </div>
  )
}
