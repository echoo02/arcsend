import {
  NetworkArbitrumOne,
  NetworkArc,
  NetworkAvalanche,
  NetworkBase,
  NetworkBinanceSmartChain,
  NetworkEthereum,
  NetworkOptimism,
  NetworkSolana,
  NetworkTron,
} from '@web3icons/react'
import { arcTestnet } from 'viem/chains'

type NetworkIcon = typeof NetworkEthereum

export type SourceKind = 'evm' | 'solana' | 'unsupported'

export interface SourceChain {
  id: string
  label: string
  kind: SourceKind
  /** App Kit chain identifier. Absent for chains CCTP does not cover. */
  bridgeChain?: 'Ethereum_Sepolia' | 'Base_Sepolia' | 'Optimism_Sepolia' | 'Arbitrum_Sepolia' | 'Avalanche_Fuji' | 'Solana_Devnet'
  /** EVM chain id used by wagmi. */
  chainId?: number
  /** Native token the user needs a little of to sign the burn on this chain. */
  gasSymbol?: string
  Icon: NetworkIcon
  note?: string
}

export const SOURCE_CHAINS: SourceChain[] = [
  { id: 'ethereum', label: 'Ethereum', kind: 'evm', bridgeChain: 'Ethereum_Sepolia', chainId: 11155111, gasSymbol: 'ETH', Icon: NetworkEthereum },
  { id: 'base', label: 'Base', kind: 'evm', bridgeChain: 'Base_Sepolia', chainId: 84532, gasSymbol: 'ETH', Icon: NetworkBase },
  { id: 'optimism', label: 'Optimism', kind: 'evm', bridgeChain: 'Optimism_Sepolia', chainId: 11155420, gasSymbol: 'ETH', Icon: NetworkOptimism },
  { id: 'arbitrum', label: 'Arbitrum', kind: 'evm', bridgeChain: 'Arbitrum_Sepolia', chainId: 421614, gasSymbol: 'ETH', Icon: NetworkArbitrumOne },
  { id: 'avalanche', label: 'Avalanche', kind: 'evm', bridgeChain: 'Avalanche_Fuji', chainId: 43113, gasSymbol: 'AVAX', Icon: NetworkAvalanche },
  { id: 'solana', label: 'Solana', kind: 'solana', bridgeChain: 'Solana_Devnet', gasSymbol: 'SOL', Icon: NetworkSolana },
  { id: 'bsc', label: 'BNB Chain', kind: 'unsupported', Icon: NetworkBinanceSmartChain, note: 'USDC transfers from BNB Chain are not supported by Circle CCTP yet.' },
  { id: 'tron', label: 'Tron', kind: 'unsupported', Icon: NetworkTron, note: 'USDC transfers from Tron are not supported by Circle CCTP yet.' },
]

export const DESTINATION = {
  label: 'Arc Testnet',
  bridgeChain: 'Arc_Testnet' as const,
  chainId: arcTestnet.id,
  Icon: NetworkArc,
}
