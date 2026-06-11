import type { PaymentMethodRepository } from '@/domain/repositories/PaymentMethodRepository'

interface BankTransferDetails {
  bankName?: string
  accountNumber?: string
  accountHolder?: string
}

interface EWalletDetails {
  phone?: string
}

interface QRISDetails {
  imageBase64?: string
  merchantName?: string
}

export interface PaymentSettings {
  bankTransfer: {
    id: string | null
    isActive: boolean
    bankName: string
    accountNumber: string
    accountHolder: string
  }
  ewallet: {
    id: string | null
    isActive: boolean
    phone: string
  }
  qris: {
    id: string | null
    isActive: boolean
    imageBase64: string
    merchantName: string
  }
}

export class ListPaymentsUseCase {
  constructor(private readonly paymentRepo: PaymentMethodRepository) {}

  async getSettings(): Promise<PaymentSettings> {
    const methods = await this.paymentRepo.findByCodes([
      'bank_transfer',
      'ewallet_manual',
      'qris_static',
    ])

    const find = (code: string) => methods.find((m) => m.code === code)

    const bankDetails = (find('bank_transfer')?.accountDetails as BankTransferDetails | null) ?? {}
    const ewalletDetails = (find('ewallet_manual')?.accountDetails as EWalletDetails | null) ?? {}
    const qrisDetails = (find('qris_static')?.accountDetails as QRISDetails | null) ?? {}

    return {
      bankTransfer: {
        id: find('bank_transfer')?.id ?? null,
        isActive: find('bank_transfer')?.isActive ?? true,
        bankName: bankDetails.bankName ?? '',
        accountNumber: bankDetails.accountNumber ?? '',
        accountHolder: bankDetails.accountHolder ?? '',
      },
      ewallet: {
        id: find('ewallet_manual')?.id ?? null,
        isActive: find('ewallet_manual')?.isActive ?? true,
        phone: ewalletDetails.phone ?? '',
      },
      qris: {
        id: find('qris_static')?.id ?? null,
        isActive: find('qris_static')?.isActive ?? true,
        imageBase64: qrisDetails.imageBase64 ?? '',
        merchantName: qrisDetails.merchantName ?? '',
      },
    }
  }
}
