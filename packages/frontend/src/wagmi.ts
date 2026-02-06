import { http, createConfig } from 'wagmi'
import { sepolia, hardhat } from 'wagmi/chains'

export const config = createConfig({
  chains: [hardhat, sepolia],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
})
