import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js'
import { supabaseAdmin } from '@/infra/supabase/server'
import { logger } from './logger'

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const TOKEN_DECIMALS = 6

export const MINT_MAP: Record<string, PublicKey> = {
  usdc: USDC_MINT,
  usdt: USDT_MINT,
}

export const CRYPTO_PRICES_USD: Record<string, number> = {
  warung: 5.99,
  starter: 17.99,
  professional: 69.99,
}

async function getDbSetting(key: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single()
  return data?.value || ''
}

async function getConnection(): Promise<Connection> {
  const dbRpc = await getDbSetting('solana_rpc_url')
  const rpcUrl = dbRpc || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  return new Connection(rpcUrl, 'confirmed')
}

async function getWalletAddress(): Promise<PublicKey> {
  const dbWallet = await getDbSetting('solana_wallet_address')
  const address = dbWallet || process.env.SOLANA_WALLET_ADDRESS
  if (!address) throw new Error('SOLANA_WALLET_ADDRESS not configured')
  return new PublicKey(address)
}

function getAssociatedTokenAddress(wallet: PublicKey, mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )
  return address
}

export function generateUniqueAmount(basePriceUsd: number): number {
  const offset = Math.floor(Math.random() * 9999) + 1
  return parseFloat((basePriceUsd + offset / 10000).toFixed(4))
}

export interface DetectedTransfer {
  signature: string
  amount: number
  sender: string
  token: string
  timestamp: number
}

export async function getRecentTransfers(
  token: 'usdc' | 'usdt',
  sinceTimestamp?: number,
): Promise<DetectedTransfer[]> {
  const connection = await getConnection()
  const wallet = await getWalletAddress()
  const mint = MINT_MAP[token]
  const ata = getAssociatedTokenAddress(wallet, mint)

  const signatures = await connection.getSignaturesForAddress(ata, { limit: 30 })

  const validSigs = sinceTimestamp
    ? signatures.filter(s => s.blockTime && s.blockTime > sinceTimestamp && !s.err)
    : signatures.filter(s => !s.err)

  if (validSigs.length === 0) return []

  const transfers: DetectedTransfer[] = []

  for (const sig of validSigs) {
    try {
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      })
      if (!tx) continue

      const found = extractTokenTransfer(tx, ata.toBase58(), token)
      if (found) {
        transfers.push({
          ...found,
          signature: sig.signature,
          timestamp: sig.blockTime || 0,
        })
      }
    } catch (err) {
      logger.error(`Failed to parse tx ${sig.signature}`, err)
    }
  }

  return transfers
}

function extractTokenTransfer(
  tx: ParsedTransactionWithMeta,
  destinationAta: string,
  token: string,
): Omit<DetectedTransfer, 'signature' | 'timestamp'> | null {
  const instructions = tx.transaction.message.instructions
  for (const ix of instructions) {
    if (!('parsed' in ix)) continue
    if (ix.program !== 'spl-token') continue

    const parsed = ix.parsed
    if (parsed.type !== 'transfer' && parsed.type !== 'transferChecked') continue

    const info = parsed.info
    if (info.destination !== destinationAta) continue

    const rawAmount = parsed.type === 'transferChecked'
      ? info.tokenAmount?.amount
      : info.amount

    if (!rawAmount) continue

    const amount = parseInt(rawAmount, 10) / Math.pow(10, TOKEN_DECIMALS)

    return {
      amount,
      sender: info.authority || info.source || 'unknown',
      token,
    }
  }

  const innerInstructions = tx.meta?.innerInstructions || []
  for (const inner of innerInstructions) {
    for (const ix of inner.instructions) {
      if (!('parsed' in ix)) continue
      if (ix.program !== 'spl-token') continue

      const parsed = ix.parsed
      if (parsed.type !== 'transfer' && parsed.type !== 'transferChecked') continue

      const info = parsed.info
      if (info.destination !== destinationAta) continue

      const rawAmount = parsed.type === 'transferChecked'
        ? info.tokenAmount?.amount
        : info.amount

      if (!rawAmount) continue

      const amount = parseInt(rawAmount, 10) / Math.pow(10, TOKEN_DECIMALS)

      return {
        amount,
        sender: info.authority || info.source || 'unknown',
        token,
      }
    }
  }

  return null
}

export async function getRecentSolTransfers(
  sinceTimestamp?: number,
): Promise<DetectedTransfer[]> {
  const connection = await getConnection()
  const wallet = await getWalletAddress()

  const signatures = await connection.getSignaturesForAddress(wallet, { limit: 30 })

  const validSigs = sinceTimestamp
    ? signatures.filter(s => s.blockTime && s.blockTime > sinceTimestamp && !s.err)
    : signatures.filter(s => !s.err)

  if (validSigs.length === 0) return []

  const transfers: DetectedTransfer[] = []

  for (const sig of validSigs) {
    try {
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      })
      if (!tx) continue

      const found = extractSolTransfer(tx, wallet.toBase58())
      if (found) {
        transfers.push({
          ...found,
          signature: sig.signature,
          timestamp: sig.blockTime || 0,
        })
      }
    } catch (err) {
      logger.error(`Failed to parse SOL tx ${sig.signature}`, err)
    }
  }

  return transfers
}

function extractSolTransfer(
  tx: ParsedTransactionWithMeta,
  destinationWallet: string,
): Omit<DetectedTransfer, 'signature' | 'timestamp'> | null {
  const instructions = tx.transaction.message.instructions
  for (const ix of instructions) {
    if (!('parsed' in ix)) continue
    if (ix.program !== 'system') continue
    if (ix.parsed?.type !== 'transfer') continue

    const info = ix.parsed.info
    if (info.destination !== destinationWallet) continue

    const amount = info.lamports / 1_000_000_000

    return {
      amount,
      sender: info.source || 'unknown',
      token: 'sol',
    }
  }
  return null
}

export async function fetchSolPriceUsd(): Promise<number> {
  // Jupiter Price API (Solana native, no rate limit)
  try {
    const res = await fetch(
      'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112',
      { signal: AbortSignal.timeout(5000) },
    )
    const data = await res.json()
    const price = parseFloat(data?.data?.['So11111111111111111111111111111111111111112']?.price)
    if (price > 0) return price
  } catch (err) {
    logger.error('Jupiter price API failed, trying CoinGecko', err)
  }

  // Fallback: CoinGecko
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { signal: AbortSignal.timeout(5000) },
    )
    const data = await res.json()
    const price = data?.solana?.usd
    if (price > 0) return price
  } catch (err) {
    logger.error('CoinGecko price API also failed', err)
  }

  return 0
}

export function matchTransferToAmount(
  transferAmount: number,
  expectedAmount: number,
  tolerance = 0.0001,
): boolean {
  return Math.abs(transferAmount - expectedAmount) < tolerance
}
