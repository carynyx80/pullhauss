/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_HELIUS_API_KEY?: string
  readonly VITE_SPR_CLUSTER?: 'devnet' | 'mainnet'
}
