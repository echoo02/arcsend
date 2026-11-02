/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet, sepolia, baseSepolia, optimismSepolia, arbitrumSepolia, avalancheFuji } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
for (const chain of [arcTestnet, sepolia, baseSepolia, optimismSepolia, arbitrumSepolia, avalancheFuji]) {
  registerChain(chain.id, chain.rpcUrls.default.http[0])
}

export const supportedChains = [arcTestnet, sepolia, baseSepolia, optimismSepolia, arbitrumSepolia, avalancheFuji] as const

export const config = createConfig({
  chains: [...supportedChains, mainnet], // mainnet needed for ENS resolution
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})
