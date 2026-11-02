import { useCallback, useEffect, useState } from 'react'
import type { CreateAdapterFromProviderParams } from '@circle-fin/adapter-solana-kit'

type PhantomLike = {
  isConnected: boolean
  publicKey: { toString(): string } | null
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>
  disconnect(): Promise<void>
  signTransaction(transaction: unknown): Promise<unknown>
  on?(event: string, handler: () => void): void
  off?(event: string, handler: () => void): void
}

export type SolanaProvider = CreateAdapterFromProviderParams['provider']

function getPhantom(): PhantomLike | undefined {
  const w = window as unknown as { phantom?: { solana?: PhantomLike }; solana?: PhantomLike }
  return w.phantom?.solana ?? w.solana
}

/** Wraps a wallet that exposes `publicKey` so it satisfies the adapter's `address` contract. */
function withAddress(wallet: PhantomLike): SolanaProvider {
  return {
    get isConnected() {
      return wallet.isConnected
    },
    get address() {
      return wallet.publicKey?.toString()
    },
    connect: async () => ({ address: (await wallet.connect()).publicKey.toString() }),
    disconnect: () => wallet.disconnect(),
    signTransaction: (transaction: unknown) => wallet.signTransaction(transaction),
  }
}

export function useSolanaWallet() {
  const [address, setAddress] = useState<string | undefined>()
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const wallet = getPhantom()
    if (!wallet) return
    const sync = () => setAddress(wallet.isConnected ? wallet.publicKey?.toString() : undefined)
    wallet.on?.('connect', sync)
    wallet.on?.('disconnect', sync)
    wallet.on?.('accountChanged', sync)
    wallet.connect({ onlyIfTrusted: true }).then(sync).catch(() => undefined)
    return () => {
      wallet.off?.('connect', sync)
      wallet.off?.('disconnect', sync)
      wallet.off?.('accountChanged', sync)
    }
  }, [])

  const connect = useCallback(async () => {
    const wallet = getPhantom()
    if (!wallet) throw new Error('No Solana wallet found. Install Phantom to send from Solana.')
    setConnecting(true)
    try {
      const res = await wallet.connect()
      setAddress(res.publicKey.toString())
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await getPhantom()?.disconnect()
    setAddress(undefined)
  }, [])

  const getProvider = useCallback((): SolanaProvider => {
    const wallet = getPhantom()
    if (!wallet) throw new Error('No Solana wallet found.')
    return withAddress(wallet)
  }, [])

  return { address, connecting, connect, disconnect, getProvider }
}
