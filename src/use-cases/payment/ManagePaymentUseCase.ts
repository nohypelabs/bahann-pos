import type {
  PaymentRequest,
  PaymentRequestRepository,
  PaymentRequestWithUser,
} from '@/domain/repositories/PaymentRequestRepository'
import type { UserRepository } from '@/domain/repositories/UserRepository'
import {
  CRYPTO_PRICES_USD, generateUniqueAmount, fetchSolPriceUsd,
  getRecentTransfers, getRecentSolTransfers, matchTransferToAmount,
} from '@/lib/solana'
import {
  PLAN_PRICES_IDR, generateUniqueAmountIDR,
  formatWaPaymentNotif, buildWaDeepLink,
} from '@/lib/payment/unique-amount'
import { sendPlanUpgradeEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { AppError } from '@/shared/exceptions/AppError'

export class ManagePaymentUseCase {
  constructor(
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async previewBankAmount(plan: string): Promise<{ uniqueAmount: number; basePrice: number }> {
    const basePrice = PLAN_PRICES_IDR[plan]
    if (!basePrice) {
      throw new AppError('Plan tidak tersedia.', 400)
    }

    const usedAmounts = new Set(await this.paymentRequestRepo.findPendingUniqueAmounts())

    let uniqueAmount = generateUniqueAmountIDR(basePrice)
    let attempts = 0
    while (usedAmounts.has(uniqueAmount) && attempts < 50) {
      uniqueAmount = generateUniqueAmountIDR(basePrice)
      attempts++
    }

    return { uniqueAmount, basePrice }
  }

  async previewCryptoAmount(
    plan: string,
    token: string,
  ): Promise<{ cryptoAmount: number; token: string }> {
    const basePriceUsd = CRYPTO_PRICES_USD[plan]
    if (!basePriceUsd) {
      throw new AppError('Plan tidak tersedia untuk crypto.', 400)
    }

    let basePrice = basePriceUsd
    if (token === 'sol') {
      const solPrice = await fetchSolPriceUsd()
      if (!solPrice) throw new AppError('Gagal mengambil harga SOL.', 500)
      basePrice = parseFloat((basePriceUsd / solPrice).toFixed(4))
    }

    const cryptoAmount = generateUniqueAmount(basePrice)
    return { cryptoAmount, token }
  }

  async createRequest(params: {
    userId: string
    plan: string
    amount: number
    paymentMethod: string
    cryptoAmount?: number
    uniqueAmount?: number
  }): Promise<{ request: PaymentRequest; waNotifLink: string | null }> {
    const existing = await this.paymentRequestRepo.findPendingByUserId(params.userId)
    if (existing) {
      throw new AppError('Anda sudah memiliki permintaan upgrade yang menunggu verifikasi.', 400)
    }

    const isCrypto = params.paymentMethod.startsWith('crypto_')
    let cryptoAmount: number | null = null
    let cryptoToken: string | null = null
    let uniqueAmount: number | null = null

    if (isCrypto) {
      cryptoToken = params.paymentMethod.replace('crypto_', '')

      if (params.cryptoAmount) {
        cryptoAmount = params.cryptoAmount
      } else {
        const basePriceUsd = CRYPTO_PRICES_USD[params.plan]
        if (!basePriceUsd) {
          throw new AppError('Plan ini tidak tersedia untuk pembayaran crypto.', 400)
        }
        let basePrice = basePriceUsd
        if (cryptoToken === 'sol') {
          const solPrice = await fetchSolPriceUsd()
          if (!solPrice) throw new AppError('Gagal mengambil harga SOL.', 500)
          basePrice = parseFloat((basePriceUsd / solPrice).toFixed(4))
        }
        cryptoAmount = generateUniqueAmount(basePrice)
      }
    } else {
      const basePrice = PLAN_PRICES_IDR[params.plan]
      if (basePrice) {
        const usedAmounts = new Set(await this.paymentRequestRepo.findPendingUniqueAmounts())
        const candidate = params.uniqueAmount || generateUniqueAmountIDR(basePrice)

        if (usedAmounts.has(candidate)) {
          let fresh = generateUniqueAmountIDR(basePrice)
          let attempts = 0
          while (usedAmounts.has(fresh) && attempts < 50) {
            fresh = generateUniqueAmountIDR(basePrice)
            attempts++
          }
          uniqueAmount = fresh
        } else {
          uniqueAmount = candidate
        }
      }
    }

    const request = await this.paymentRequestRepo.create({
      userId: params.userId,
      plan: params.plan,
      amount: uniqueAmount || params.amount,
      paymentMethod: params.paymentMethod,
      cryptoAmount,
      cryptoToken,
      uniqueAmount,
    })

    let waNotifLink: string | null = null
    if (!isCrypto) {
      const settings = await this.paymentRequestRepo.getPlatformSettings(['support_wa'])
      const adminWa = settings.support_wa || process.env.NEXT_PUBLIC_SUPPORT_WA

      if (adminWa) {
        const user = await this.userRepo.findById(params.userId)
        const msg = formatWaPaymentNotif({
          userEmail: user?.email || 'unknown',
          userName: user?.name || 'User',
          plan: params.plan,
          uniqueAmount: uniqueAmount || params.amount,
        })
        waNotifLink = buildWaDeepLink(adminWa, msg)
      }
    }

    return { request, waNotifLink }
  }

  async uploadProof(params: {
    userId: string
    requestId: string
    proofBase64: string
    fileName: string
  }): Promise<{ url: string }> {
    const req = await this.paymentRequestRepo.findById(params.requestId)

    if (!req || req.userId !== params.userId) {
      throw new AppError('Request not found', 404)
    }
    if (req.status !== 'pending') {
      throw new AppError('Request sudah diproses', 400)
    }

    const url = await this.paymentRequestRepo.uploadProof(
      params.userId,
      params.requestId,
      params.proofBase64,
      params.fileName,
    )

    await this.paymentRequestRepo.updateProofUrl(params.requestId, url)

    return { url }
  }

  async getMyRequests(userId: string): Promise<PaymentRequest[]> {
    return this.paymentRequestRepo.findByUserId(userId)
  }

  async checkCryptoPayment(userId: string): Promise<{ checked: boolean; matched: boolean }> {
    const pending = await this.paymentRequestRepo.findPendingCryptoByUserId(userId)

    if (!pending || !pending.cryptoAmount || !pending.cryptoToken) {
      return { checked: false, matched: false }
    }

    const sinceTimestamp = Math.floor(new Date(pending.createdAt).getTime() / 1000) - 300

    try {
      let transfers
      if (pending.cryptoToken === 'sol') {
        transfers = await getRecentSolTransfers(sinceTimestamp)
      } else {
        transfers = await getRecentTransfers(pending.cryptoToken as 'usdc' | 'usdt', sinceTimestamp)
      }

      const tolerance = pending.cryptoToken === 'sol' ? 0.000001 : 0.0001
      const match = transfers.find(t =>
        matchTransferToAmount(t.amount, pending.cryptoAmount!, tolerance)
      )

      if (!match) return { checked: true, matched: false }

      await this.paymentRequestRepo.updateStatus(pending.id, 'approved', {
        crypto_tx_hash: match.signature,
        admin_note: `Auto-verified on-chain. TX: ${match.signature.slice(0, 16)}...`,
        reviewed_at: new Date().toISOString(),
      })

      const user = await this.userRepo.findById(pending.userId)
      const currentPlan = await this.userRepo.getPlan(pending.userId)

      await this.userRepo.activatePlan(pending.userId, pending.plan)

      await this.userRepo.insertBillingHistory({
        userId: pending.userId,
        plan: pending.plan,
        previousPlan: currentPlan,
        amount: pending.amount,
        note: `Crypto payment (${pending.cryptoToken!.toUpperCase()}) auto-verified. TX: ${match.signature.slice(0, 16)}...`,
        isTrial: false,
        changedBy: pending.userId,
      })

      if (user?.email && user?.name) {
        await sendPlanUpgradeEmail({
          to: user.email,
          name: user.name,
          oldPlan: currentPlan,
          newPlan: pending.plan,
        })
      }

      logger.info(`checkMyPayment: auto-approved ${pending.id} via TX ${match.signature.slice(0, 16)}`)
      return { checked: true, matched: true }
    } catch (err) {
      logger.error('checkMyPayment: error checking on-chain', err as Error)
      return { checked: true, matched: false }
    }
  }

  async getConfig(): Promise<{
    crypto: { enabled: boolean; walletAddress: string; prices: Record<string, number>; solPriceUsd: number }
    bank: { name: string; account: string; holder: string }
    qrisImageUrl: string
    supportWa: string
  }> {
    const settings = await this.paymentRequestRepo.getPlatformSettings([
      'solana_wallet_address', 'solana_rpc_url',
      'bank_name', 'bank_account', 'bank_holder',
      'qris_image_url', 'support_wa',
    ])

    const get = (key: string, envFallback?: string) => settings[key] || envFallback || ''

    const walletAddress = get('solana_wallet_address', process.env.SOLANA_WALLET_ADDRESS)

    let solPrice = 0
    if (walletAddress) {
      try { solPrice = await fetchSolPriceUsd() } catch { /* fallback 0 */ }
    }

    return {
      crypto: {
        enabled: !!walletAddress,
        walletAddress,
        prices: CRYPTO_PRICES_USD,
        solPriceUsd: solPrice,
      },
      bank: {
        name: get('bank_name', process.env.NEXT_PUBLIC_BANK_NAME),
        account: get('bank_account', process.env.NEXT_PUBLIC_BANK_ACCOUNT),
        holder: get('bank_holder', process.env.NEXT_PUBLIC_BANK_HOLDER),
      },
      qrisImageUrl: get('qris_image_url'),
      supportWa: get('support_wa', process.env.NEXT_PUBLIC_SUPPORT_WA),
    }
  }

  async listAll(params: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ requests: PaymentRequestWithUser[]; total: number }> {
    return this.paymentRequestRepo.listAll({
      status: params.status,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  }

  async approve(params: {
    requestId: string
    reviewedBy: string
    note?: string
  }): Promise<{ success: boolean }> {
    const req = await this.paymentRequestRepo.findById(params.requestId)
    if (!req) throw new AppError('Request not found', 404)
    if (req.status !== 'pending') throw new AppError('Request sudah diproses', 400)

    const user = await this.userRepo.findById(req.userId)
    const currentPlan = await this.userRepo.getPlan(req.userId)

    await this.paymentRequestRepo.approve(params.requestId, params.reviewedBy, params.note)

    await this.userRepo.activatePlan(req.userId, req.plan)

    await this.userRepo.insertBillingHistory({
      userId: req.userId,
      plan: req.plan,
      previousPlan: currentPlan,
      amount: req.amount,
      note: params.note || 'Manual payment approved',
      isTrial: false,
      changedBy: params.reviewedBy,
    })

    if (user?.email && user?.name) {
      await sendPlanUpgradeEmail({
        to: user.email,
        name: user.name,
        oldPlan: currentPlan,
        newPlan: req.plan,
      })
    }

    return { success: true }
  }

  async reject(params: {
    requestId: string
    reviewedBy: string
    note: string
  }): Promise<{ success: boolean }> {
    const req = await this.paymentRequestRepo.findById(params.requestId)
    if (!req) throw new AppError('Request not found', 404)
    if (req.status !== 'pending') throw new AppError('Request sudah diproses', 400)

    await this.paymentRequestRepo.reject(params.requestId, params.reviewedBy, params.note)

    return { success: true }
  }
}
