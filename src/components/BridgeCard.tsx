import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { isAddress } from 'viem'
import { AlertTriangle, ArrowDown, Loader2 } from 'lucide-react'
import { NetworkArc, TokenUSDC } from '@web3icons/react'
import { toast } from 'sonner'
import { DESTINATION, SOURCE_CHAINS, type SourceChain } from '@/lib/chains'
import { Amount } from '@/onchain-money'
import { USDC_DECIMALS, buildAddressExplorerUrl } from '@/onchain-facts'
import { useSolanaWallet } from '@/hooks/useSolanaWallet'
import { useSourceBalance } from '@/hooks/useSourceBalance'
import { useBridgeEstimate, useBridgeTransfer } from '@/hooks/useBridge'
import { ChainPicker } from './ChainPicker'
import { FeePreview } from './FeePreview'
import { TransferProgress } from './TransferProgress'

const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`

function parseAmount(value: string): Amount | undefined {
  if (!value) return undefined
  try {
    const a = Amount.parse(value, USDC_DECIMALS)
    return a.isPositive() ? a : undefined
  } catch {
    return undefined
  }
}

export function BridgeCard() {
  const [source, setSource] = useState<SourceChain>(SOURCE_CHAINS[1])
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [touched, setTouched] = useState(false)

  const { address: evmAddress } = useAccount()
  const solana = useSolanaWallet()
  const balance = useSourceBalance(source, evmAddress, solana.address)
  const transfer = useBridgeTransfer(source, solana)

  useEffect(() => {
    if (!touched && evmAddress) setRecipient(evmAddress)
  }, [evmAddress, touched])

  const parsed = parseAmount(amount)
  const recipientValid = isAddress(recipient)
  const walletConnected = source.kind === 'solana' ? Boolean(solana.address) : Boolean(evmAddress)
  const insufficient = Boolean(parsed && balance.raw !== undefined && parsed.raw > balance.raw)
  const supported = source.kind !== 'unsupported'
  const busy = transfer.phase === 'preparing' || transfer.phase === 'running'
  const canSend = supported && walletConnected && Boolean(parsed) && recipientValid && !insufficient && !busy

  const estimate = useBridgeEstimate({
    source,
    solana,
    recipient: recipientValid ? recipient : undefined,
    amount: parsed?.toString(),
    ready: canSend && transfer.phase === 'idle',
  })

  useEffect(() => {
    if (transfer.phase === 'success') {
      toast.success('USDC is on its way to Arc')
      void balance.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer.phase])

  const accountLine = useMemo(() => {
    if (source.kind === 'solana') return solana.address
    if (source.kind === 'evm') return evmAddress
    return undefined
  }, [source.kind, solana.address, evmAddress])

  const onAmount = (value: string) => {
    const clean = value.replace(/[^0-9.]/g, '')
    if (clean === '' || /^\d*\.?\d{0,6}$/.test(clean)) setAmount(clean)
  }

  const onChangeSource = (next: SourceChain) => {
    setSource(next)
    transfer.reset()
  }

  const showFlow = transfer.phase !== 'idle'

  return (
    <section className="glass w-full rounded-3xl p-5 shadow-2xl shadow-black/20">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--subtle)' }}>
          Send from
        </span>
        {accountLine && (
          <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
            {short(accountLine)}
          </span>
        )}
      </div>
      <ChainPicker value={source} onChange={onChangeSource} disabled={busy} />

      {!supported ? (
        <div className="glass-inner mt-4 flex gap-3 rounded-2xl p-4 text-sm" style={{ color: 'var(--muted)' }}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
          <p className="text-pretty">{source.note} Pick Ethereum, Base, Optimism, Arbitrum, Avalanche or Solana to send now.</p>
        </div>
      ) : (
        <>
          <div className="glass-inner mt-4 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <input
                inputMode="decimal"
                aria-label="Amount of USDC to send"
                value={amount}
                disabled={busy}
                onChange={(e) => onAmount(e.target.value)}
                placeholder="0.00"
                className="display w-full min-w-0 bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-500"
                style={{ color: 'var(--ink)' }}
              />
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                <TokenUSDC variant="branded" size={22} /> USDC
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span style={{ color: insufficient ? 'var(--danger)' : 'var(--subtle)' }}>
                {insufficient ? 'Amount exceeds your balance' : `On ${source.label}`}
              </span>
              <button
                type="button"
                disabled={!balance.formatted || busy}
                onClick={() => balance.formatted && setAmount(balance.formatted)}
                className="min-h-[28px] font-semibold tabular-nums disabled:opacity-50"
                style={{ color: 'var(--accent)' }}
              >
                {!walletConnected ? 'Connect to see balance' : balance.isLoading ? 'Loading...' : balance.formatted ? `Balance: ${balance.formatted} · Max` : 'Balance unavailable'}
              </button>
            </div>
          </div>

          <div className="my-2 flex justify-center" aria-hidden>
            <span className="flex size-8 items-center justify-center rounded-full" style={{ background: 'var(--surface-strong)', color: 'var(--accent)' }}>
              <ArrowDown className="size-4" />
            </span>
          </div>

          <div className="glass-inner rounded-2xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                <NetworkArc variant="branded" size={20} /> {DESTINATION.label}
              </span>
              {evmAddress && recipient !== evmAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipient(evmAddress)
                    setTouched(false)
                  }}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  Use my wallet
                </button>
              )}
            </div>
            <label className="sr-only" htmlFor="recipient">
              Recipient address on Arc
            </label>
            <input
              id="recipient"
              value={recipient}
              disabled={busy}
              onChange={(e) => {
                setTouched(true)
                setRecipient(e.target.value.trim())
              }}
              placeholder="Recipient address (0x...)"
              spellCheck={false}
              autoComplete="off"
              className="mono w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              style={{ color: 'var(--ink)' }}
            />
            {recipient && !recipientValid && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
                Enter a valid 0x address on Arc.
              </p>
            )}
            {recipientValid && (
              <a
                href={buildAddressExplorerUrl(DESTINATION.chainId, recipient)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-xs"
                style={{ color: 'var(--subtle)' }}
              >
                View on ArcScan
              </a>
            )}
          </div>

          <div className="mt-3">
            <FeePreview
              estimate={estimate.estimate}
              loading={estimate.loading}
              failed={estimate.failed}
              gasSymbol={source.gasSymbol}
              sourceLabel={source.label}
            />
          </div>

          {showFlow && (
            <div className="mt-3 space-y-3">
              <TransferProgress phase={transfer.phase} done={transfer.done} links={transfer.links} sourceLabel={source.label} />
              {transfer.phase === 'success' && (
                <div className="glass-inner rounded-2xl p-4 text-sm">
                  <div className="font-semibold" style={{ color: 'var(--success)' }}>
                    Sent to Arc
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    {short(recipient)} received your USDC on Arc Testnet.
                  </p>
                </div>
              )}
              {transfer.phase === 'error' && transfer.error && (
                <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(232,109,122,0.10)', border: '1px solid rgba(232,109,122,0.35)', color: 'var(--danger)' }}>
                  {transfer.error}
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <Cta
              source={source}
              walletConnected={walletConnected}
              solanaConnecting={solana.connecting}
              onSolanaConnect={() => {
                solana.connect().catch((e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not connect wallet'))
              }}
              phase={transfer.phase}
              canSend={canSend}
              hasAmount={Boolean(parsed)}
              insufficient={insufficient}
              recipientValid={recipientValid}
              amount={parsed?.toString() ?? ''}
              canRetry={transfer.canRetry}
              onSend={() => {
                if (parsed) void transfer.send(parsed.toString(), recipient)
              }}
              onRetry={() => {
                void transfer.retry()
              }}
              onReset={() => {
                transfer.reset()
                setAmount('')
              }}
            />
          </div>
        </>
      )}
    </section>
  )
}

interface CtaProps {
  source: SourceChain
  walletConnected: boolean
  solanaConnecting: boolean
  onSolanaConnect: () => void
  phase: ReturnType<typeof useBridgeTransfer>['phase']
  canSend: boolean
  hasAmount: boolean
  insufficient: boolean
  recipientValid: boolean
  amount: string
  canRetry: boolean
  onSend: () => void
  onRetry: () => void
  onReset: () => void
}

const ctaClass =
  'flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40'
const ctaStyle = { background: 'var(--accent)', color: '#0d1b2f' }

function Cta(p: CtaProps) {
  if (!p.walletConnected) {
    if (p.source.kind === 'solana') {
      return (
        <button type="button" className={ctaClass} style={ctaStyle} onClick={p.onSolanaConnect} disabled={p.solanaConnecting}>
          {p.solanaConnecting ? <Loader2 className="size-4 animate-spin" /> : null} Connect Solana wallet
        </button>
      )
    }
    return (
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button type="button" className={ctaClass} style={ctaStyle} onClick={show}>
            Connect wallet
          </button>
        )}
      </ConnectKitButton.Custom>
    )
  }
  if (p.phase === 'success') {
    return (
      <button type="button" className={ctaClass} style={ctaStyle} onClick={p.onReset}>
        Send another
      </button>
    )
  }
  if (p.phase === 'error' && p.canRetry) {
    return (
      <button type="button" className={ctaClass} style={ctaStyle} onClick={p.onRetry}>
        Resume transfer
      </button>
    )
  }
  if (p.phase === 'preparing' || p.phase === 'running') {
    return (
      <button type="button" className={ctaClass} style={ctaStyle} disabled>
        <Loader2 className="size-4 animate-spin" /> {p.phase === 'preparing' ? 'Confirm in your wallet' : 'Sending to Arc'}
      </button>
    )
  }
  const label = !p.hasAmount ? 'Enter an amount' : p.insufficient ? 'Insufficient USDC' : !p.recipientValid ? 'Enter a recipient' : `Send ${p.amount} USDC to Arc`
  return (
    <button type="button" className={ctaClass} style={ctaStyle} disabled={!p.canSend} onClick={p.onSend}>
      {label}
    </button>
  )
}
