import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import { createSolanaKitAdapterFromProvider } from '@circle-fin/adapter-solana-kit'
import type { EIP1193Provider } from 'viem'
import { supportedChains } from '@/config'
import { appKit, friendlyError, isUserRejection, withAddChainFallback } from '@/lib/bridge'
import { DESTINATION, type SourceChain } from '@/lib/chains'
import { useSolanaWallet } from '@/hooks/useSolanaWallet'

type BridgeParams = Parameters<typeof appKit.bridge>[0]
type BridgeResult = Awaited<ReturnType<typeof appKit.bridge>>
type SourceAdapter = Parameters<typeof appKit.retryBridge>[1]['from']

export const STEP_ORDER = ['approve', 'burn', 'fetchAttestation', 'mint'] as const
export type StepName = (typeof STEP_ORDER)[number]

export interface TxLink {
  step: string
  url?: string
  hash?: string
}

export type Phase = 'idle' | 'preparing' | 'running' | 'success' | 'error'

export interface FeeLine {
  label: string
  amount: string | null
}

export interface Estimate {
  fees: FeeLine[]
  gas: { label: string; amount: string; token: string }[]
}

interface Evt {
  method?: string
  values?: { txHash?: string; transactionHash?: string }
}

type Wallet = ReturnType<typeof useSolanaWallet>

function useAdapterFactory(source: SourceChain, solana: Wallet) {
  const { connector } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { chainId } = useAccount()

  return useCallback(
    async (opts: { switchChain: boolean }): Promise<SourceAdapter> => {
      if (source.kind === 'solana') {
        return createSolanaKitAdapterFromProvider({ provider: solana.getProvider() }) as unknown as SourceAdapter
      }
      if (!connector || !source.chainId) throw new Error('Connect an EVM wallet first.')
      if (opts.switchChain && chainId !== source.chainId) await switchChainAsync({ chainId: source.chainId })
      const provider = (await connector.getProvider()) as EIP1193Provider
      return await createViemAdapterFromProvider({
        provider: withAddChainFallback(provider, supportedChains),
      })
    },
    [source, solana, connector, chainId, switchChainAsync],
  )
}

export function useBridgeEstimate(params: {
  source: SourceChain
  solana: Wallet
  recipient?: string
  amount?: string
  ready: boolean
}) {
  const { source, solana, recipient, amount, ready } = params
  const makeAdapter = useAdapterFactory(source, solana)
  const key = ready && recipient && amount && source.bridgeChain ? `${source.id}|${recipient}|${amount}` : undefined
  const [result, setResult] = useState<{ key: string; estimate?: Estimate; failed: boolean } | undefined>()
  const [loadingKey, setLoadingKey] = useState<string | undefined>()

  useEffect(() => {
    if (!key || !recipient || !amount) return
    let cancelled = false
    const run = async () => {
      setLoadingKey(key)
      try {
        const adapter = await makeAdapter({ switchChain: false })
        const res = await appKit.estimateBridge({
          from: { adapter, chain: source.bridgeChain },
          to: { chain: DESTINATION.bridgeChain, recipientAddress: recipient, useForwarder: true },
          amount,
        } as unknown as BridgeParams)
        if (cancelled) return
        const labelFor = (type: string) =>
          type === 'forwarder' ? 'Arc delivery (gas, paid in USDC)' : type === 'provider' ? 'Fast transfer fee' : 'Service fee'
        setResult({
          key,
          failed: false,
          estimate: {
            fees: res.fees.map((f) => ({ label: labelFor(f.type), amount: f.amount })),
            gas: res.gasFees
              .filter((g) => g.fees?.fee)
              .map((g) => ({ label: g.name, amount: g.fees?.fee ?? '', token: g.token })),
          },
        })
      } catch {
        if (!cancelled) setResult({ key, failed: true })
      } finally {
        if (!cancelled) setLoadingKey(undefined)
      }
    }
    const timer = setTimeout(() => {
      void run()
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key, recipient, amount, source, makeAdapter])

  const current = result && result.key === key ? result : undefined
  return { estimate: current?.estimate, loading: Boolean(key) && loadingKey === key, failed: Boolean(current?.failed) }
}

export function useBridgeTransfer(source: SourceChain, solana: Wallet) {
  const makeAdapter = useAdapterFactory(source, solana)
  const [phase, setPhase] = useState<Phase>('idle')
  const [done, setDone] = useState<Set<StepName>>(new Set())
  const [links, setLinks] = useState<TxLink[]>([])
  const [error, setError] = useState<string | undefined>()
  const [canRetry, setCanRetry] = useState(false)
  const lastResult = useRef<BridgeResult | undefined>(undefined)
  const lastAdapter = useRef<SourceAdapter | undefined>(undefined)

  useEffect(() => {
    const handler = (payload: unknown) => {
      const evt = payload as Evt
      const name = evt.method?.replace('bridge.', '') as StepName | undefined
      if (!name || !STEP_ORDER.includes(name)) return
      const idx = STEP_ORDER.indexOf(name)
      setDone((prev) => new Set([...prev, ...STEP_ORDER.slice(0, idx + 1)]))
      setPhase('running')
    }
    appKit.on('*', handler)
    return () => appKit.off('*', handler)
  }, [])

  const finish = useCallback((result: BridgeResult) => {
    lastResult.current = result
    setCanRetry(result.state !== 'success')
    setLinks(
      result.steps
        .filter((s) => s.txHash)
        .map((s) => ({ step: s.name, url: s.explorerUrl, hash: s.txHash })),
    )
    if (result.state === 'success') {
      setDone(new Set(STEP_ORDER))
      setPhase('success')
    } else {
      const failed = result.steps.find((s) => s.state === 'error')
      setError(failed ? `The ${failed.name} step failed. Your funds are safe; you can resume the transfer.` : 'The transfer did not finish. You can resume it.')
      setPhase('error')
    }
  }, [])

  const send = useCallback(
    async (amount: string, recipient: string) => {
      if (!source.bridgeChain) return
      setError(undefined)
      setDone(new Set())
      setLinks([])
      setPhase('preparing')
      lastResult.current = undefined
      setCanRetry(false)
      try {
        const adapter = await makeAdapter({ switchChain: true })
        lastAdapter.current = adapter
        const result = await appKit.bridge({
          from: { adapter, chain: source.bridgeChain },
          to: { chain: DESTINATION.bridgeChain, recipientAddress: recipient, useForwarder: true },
          amount,
        } as unknown as BridgeParams)
        finish(result)
      } catch (e) {
        if (isUserRejection(e)) {
          setPhase('idle')
          return
        }
        setError(friendlyError(e))
        setPhase('error')
      }
    },
    [source, makeAdapter, finish],
  )

  const retry = useCallback(async () => {
    const result = lastResult.current
    if (!result) return
    setError(undefined)
    setPhase('running')
    try {
      const adapter = lastAdapter.current ?? (await makeAdapter({ switchChain: true }))
      finish(await appKit.retryBridge(result, { from: adapter }))
    } catch (e) {
      setError(friendlyError(e))
      setPhase('error')
    }
  }, [makeAdapter, finish])

  const reset = useCallback(() => {
    setPhase('idle')
    setDone(new Set())
    setLinks([])
    setError(undefined)
    lastResult.current = undefined
    setCanRetry(false)
  }, [])

  return { phase, done, links, error, send, retry, reset, canRetry }
}
