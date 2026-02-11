import { http, createConfig } from 'wagmi'
import { sepolia, hardhat as baseHardhat } from 'wagmi/chains'

// 自定义 hardhat 链配置，禁用 multicall 以避免本地节点报错导致的延迟
const hardhat = {
  ...baseHardhat,
  contracts: {
    ...baseHardhat.contracts,
    multicall3: undefined,
  },
}

export const config = createConfig({
  chains: [hardhat, sepolia],
  transports: {
    // 显式指定 127.0.0.1 避免 localhost DNS 解析延迟
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
  },
})