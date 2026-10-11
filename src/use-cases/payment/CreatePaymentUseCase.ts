import type { PaymentMethodRepository } from '@/domain/repositories/PaymentMethodRepository'
import { normalizeImageUpload } from '@/lib/security/imageUpload'

interface BankTransferInput {
  bankName: string
  accountNumber: string
  accountHolder: string
  isActive?: boolean
}

interface EWalletInput {
  phone: string
  isActive?: boolean
}

interface QRISInput {
  imageBase64: string
  merchantName?: string
  isActive?: boolean
}

export class CreatePaymentUseCase {
  constructor(private readonly paymentRepo: PaymentMethodRepository) {}

  async updateBankTransfer(tenantId: string, input: BankTransferInput): Promise<{ success: boolean }> {
    const accountDetails = {
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountHolder: input.accountHolder,
    }
    await this.paymentRepo.saveForTenant(tenantId, 'bank_transfer', accountDetails, input.isActive ?? true)
    return { success: true }
  }

  async updateEWallet(tenantId: string, input: EWalletInput): Promise<{ success: boolean }> {
    await this.paymentRepo.saveForTenant(
      tenantId,
      'ewallet_manual',
      { phone: input.phone },
      input.isActive ?? true,
    )
    return { success: true }
  }

  async updateQRIS(tenantId: string, input: QRISInput): Promise<{ success: boolean }> {
    const qrisImage = normalizeImageUpload(input.imageBase64, {
      label: 'Gambar QRIS',
      maxBytes: 2 * 1024 * 1024,
    })

    const accountDetails = {
      imageBase64: qrisImage.dataUrl,
      merchantName: input.merchantName ?? 'Laku POS',
    }
    await this.paymentRepo.saveForTenant(tenantId, 'qris_static', accountDetails, input.isActive ?? true)
    return { success: true }
  }
}
