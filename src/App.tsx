import { ConnectKitButton } from 'connectkit'
import { BridgeCard } from '@/components/BridgeCard'

export default function App() {
  return (
    <main className="min-h-dvh px-4 pb-24 pt-6">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 flex items-center justify-between">
          <span className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>
            Arc Send
          </span>
          <ConnectKitButton showBalance={false} />
        </header>

        <h1 className="display mb-2 text-balance text-4xl font-bold leading-tight" style={{ color: 'var(--ink)' }}>
          Send USDC to Arc from any chain
        </h1>
        <p className="mb-6 text-pretty text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          Move USDC from Ethereum, Base, Optimism, Arbitrum, Avalanche or Solana. On Arc, fees are paid in USDC.
        </p>

        <BridgeCard />

        <p className="mt-4 text-center text-xs text-pretty" style={{ color: 'var(--subtle)' }}>
          Testnet only. You need test USDC and a little gas token on the source chain, available from Circle's faucet.
        </p>
      </div>
    </main>
  )
}
