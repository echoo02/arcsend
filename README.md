# Arc Send

Send testnet USDC to Arc from Ethereum, Base, Optimism, Arbitrum, Avalanche or Solana. Fees on Arc are paid in USDC, and Circle delivers the funds so the recipient needs no gas token.

Built with [Arc Studio](https://studio.arc.io)

## Notes

- BNB Chain and Tron are shown but disabled: Circle's cross-chain USDC transfer protocol does not cover them yet.
- Testnet only. You need test USDC and a little of the source chain's gas token to sign the transfer.
- Solana transfers need the Phantom wallet. EVM chains use any injected browser wallet.

## Tech stack

React, Vite, TypeScript, Tailwind CSS, wagmi, viem, ConnectKit, Circle App Kit.

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev
bun run check
```

### Environment variables

None.
