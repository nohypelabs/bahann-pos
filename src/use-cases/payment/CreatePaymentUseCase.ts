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

  async updateBankTransfer(input: BankTransferInput): Promise<{ success: boolean }> {
    const accountDetails = {
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountHolder: input.accountHolder,
    }
    await this.paymentRepo.updateByCode('bank_transfer', accountDetails, input.isActive ?? true)
    return { success: true }
  }

  async updateEWallet(input: EWalletInput): Promise<{ success: boolean }> {
    await this.paymentRepo.updateByCode(
      'ewallet_manual',
      { phone: input.phone },
      input.isActive ?? true,
    )
    return { success: true }
  }

  async updateQRIS(input: QRISInput): Promise<{ success: boolean }> {
    const qrisImage = normalizeImageUpload(input.imageBase64, {
      label: 'Gambar QRIS',
      maxBytes: 2 * 1024 * 1024,
    })

    const accountDetails = {
      imageBase64: qrisImage.dataUrl,
      merchantName: input.merchantName ?? 'Laku POS',
    }
    await this.paymentRepo.updateByCode('qris_static', accountDetails, input.isActive ?? true)
    return { success: true }
  }
}
