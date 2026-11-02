import { useQuery } from '@tanstack/react-query'
import { useReadContract } from 'wagmi'
import { erc20Abi, type Address } from 'viem'
import { SolanaDevnet } from '@circle-fin/bridge-kit/chains'
import { getUsdc, USDC_DECIMALS } from '@/onchain-facts'
import { formatUsdc } from '@/onchain-money'
import type { SourceChain } from '@/lib/chains'

interface SolanaTokenAccounts {
  result?: { value: { account: { data: { parsed: { info: { tokenAmount: { amount: string } } } } } }[] }
  error?: { message: string }
}

async function fetchSolanaUsdc(owner: string): Promise<bigint> {
  const res = await fetch(SolanaDevnet.rpcEndpoints[0], {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [owner, { mint: SolanaDevnet.usdcAddress }, { encoding: 'jsonParsed' }],
    }),
  })
  const json = (await res.json()) as SolanaTokenAccounts
  if (json.error || !json.result) throw new Error(json.error?.message ?? 'Solana RPC error')
  return json.result.value.reduce((sum, acct) => sum + BigInt(acct.account.data.parsed.info.tokenAmount.amount), 0n)
}

/** Live source-chain USDC balance (ERC-20 view for EVM, SPL token accounts for Solana). */
export function useSourceBalance(source: SourceChain, evmAddress?: Address, solanaAddress?: string) {
  const usdc = source.chainId ? getUsdc(source.chainId) : undefined

  const evm = useReadContract({
    address: usdc?.address as Address | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: evmAddress ? [evmAddress] : undefined,
    chainId: source.chainId,
    query: { enabled: source.kind === 'evm' && Boolean(usdc && evmAddress), refetchInterval: 15_000 },
  })

  const sol = useQuery({
    queryKey: ['solana-usdc', solanaAddress],
    queryFn: () => fetchSolanaUsdc(solanaAddress as string),
    enabled: source.kind === 'solana' && Boolean(solanaAddress),
    refetchInterval: 15_000,
  })

  const raw = source.kind === 'evm' ? evm.data : source.kind === 'solana' ? sol.data : undefined
  const isLoading = source.kind === 'evm' ? evm.isLoading : source.kind === 'solana' ? sol.isLoading : false
  const refetch = source.kind === 'evm' ? evm.refetch : sol.refetch

  return {
    raw,
    formatted: raw !== undefined ? formatUsdc(raw) : undefined,
    decimals: USDC_DECIMALS,
    isLoading,
    refetch,
  }
}
