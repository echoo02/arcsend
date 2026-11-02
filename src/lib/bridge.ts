import { AppKit } from '@circle-fin/app-kit'
import { numberToHex, type Chain, type EIP1193Provider } from 'viem'

export const appKit = new AppKit()

const isUnrecognizedChain = (error: unknown) => {
  const e = error as { code?: number; data?: { originalError?: { code?: number } } }
  return e?.code === 4902 || e?.data?.originalError?.code === 4902
}

/** Adds a chain to the wallet when it rejects a switch with 4902, then retries the switch. */
export function withAddChainFallback(provider: EIP1193Provider, chains: readonly Chain[]): EIP1193Provider {
  const send = provider.request.bind(provider) as (args: { method: string; params?: unknown }) => Promise<unknown>
  const request = (async (args: { method: string; params?: unknown }) => {
    try {
      return await send(args)
    } catch (error) {
      if (args.method !== 'wallet_switchEthereumChain' || !isUnrecognizedChain(error)) throw error
      const [{ chainId }] = args.params as [{ chainId: string }]
      const chain = chains.find((c) => c.id === Number(chainId))
      if (!chain) throw error
      await send({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: numberToHex(chain.id),
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [...chain.rpcUrls.default.http],
            blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
          },
        ],
      })
      return send(args)
    }
  }) as EIP1193Provider['request']

  return new Proxy(provider, {
    get(target, prop) {
      if (prop === 'request') return request
      const value: unknown = Reflect.get(target, prop, target)
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value
    },
  })
}

export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const message = raw.toLowerCase()
  if (message.includes('user rejected') || message.includes('rejected the request') || message.includes('user denied') || (error as { code?: number })?.code === 4001) {
    return 'Request cancelled in your wallet.'
  }
  if (message.includes('insufficient funds') || message.includes('exceeds balance') || message.includes('insufficient')) {
    return 'Not enough balance. Check your USDC and the small amount of gas needed on the source chain.'
  }
  if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
    return 'Network issue. Check your connection and try again.'
  }
  if (message.includes('reverted')) return 'The transaction was reverted. Try again.'
  return raw ? raw.slice(0, 180) : 'Something went wrong. Please try again.'
}

export function isUserRejection(error: unknown): boolean {
  return friendlyError(error) === 'Request cancelled in your wallet.'
}
