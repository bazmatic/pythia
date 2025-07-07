import { Token } from '@uniswap/sdk-core';
import { ChainId } from '@uniswap/sdk-core';

export interface TokenConfig {
  address: string;
  decimals: number;
  symbol: string;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  factoryAddress: string;
  routerAddress: string;
  tokens: {
    [key: string]: TokenConfig;
  };
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  [ChainId.ARBITRUM_ONE]: {
    chainId: ChainId.ARBITRUM_ONE,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    routerAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    tokens: {
      WETH: {
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        decimals: 18,
        symbol: 'WETH'
      },
      USDC: {
        address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        decimals: 6,
        symbol: 'USDC'
      },
      PENDLE: {
        address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
        decimals: 18,
        symbol: 'PENDLE'
      }
    }
  },
  [ChainId.BASE]: {
    chainId: ChainId.BASE,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
    routerAddress: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
    tokens: {
      WETH: {
        address: '0x4200000000000000000000000000000000000006',
        decimals: 18,
        symbol: 'WETH'
      },
      USDC: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        symbol: 'USDC'
      }
    }
  }
};

export function getToken(chainId: number, symbol: string): Token {
  const chainConfig = CHAIN_CONFIGS[chainId];
  if (!chainConfig) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const tokenConfig = chainConfig.tokens[symbol];
  if (!tokenConfig) {
    throw new Error(`Token ${symbol} not found on chain ${chainId}`);
  }

  return new Token(
    chainId,
    tokenConfig.address,
    tokenConfig.decimals,
    tokenConfig.symbol
  );
}

export function getAlchemyRpcUrl(chainId: number, apiKey: string): string {
  switch (chainId) {
    case ChainId.ARBITRUM_ONE:
      return `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
    case ChainId.BASE:
      return `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
} 