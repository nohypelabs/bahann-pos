export interface PaymentRequest {
  id: string
  userId: string
  plan: string
  amount: number
  paymentMethod: string
  status: string
  proofUrl: string | null
  adminNote: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  cryptoAmount: number | null
  cryptoToken: string | null
  cryptoTxHash: string | null
  uniqueAmount: number | null
  createdAt: string
}

export interface CreatePaymentRequestData {
  userId: string
  plan: string
  amount: number
  paymentMethod: string
  cryptoAmount: number | null
  cryptoToken: string | null
  uniqueAmount: number | null
}

export interface ListParams {
  status?: string
  limit: number
  offset: number
}

export interface PaymentRequestWithUser extends PaymentRequest {
  user: {
    id: string
    name: string
    email: string
    plan: string
  } | null
}

export interface PaymentRequestRepository {
  findPendingByUserId(userId: string): Promise<PaymentRequest | null>
  findPendingUniqueAmounts(): Promise<number[]>
  create(data: CreatePaymentRequestData): Promise<PaymentRequest>
  findById(id: string): Promise<PaymentRequest | null>
  updateProofUrl(id: string, url: string): Promise<void>
  findByUserId(userId: string): Promise<PaymentRequest[]>
  findPendingCryptoByUserId(userId: string): Promise<PaymentRequest | null>
  approve(id: string, reviewedBy: string, note?: string): Promise<void>
  reject(id: string, reviewedBy: string, note: string): Promise<void>
  updateStatus(id: string, status: string, data: Record<string, unknown>): Promise<void>
  listAll(params: ListParams): Promise<{ requests: PaymentRequestWithUser[]; total: number }>
  uploadProof(userId: string, requestId: string, base64: string, fileName: string): Promise<string>
  getPlatformSettings(keys: string[]): Promise<Record<string, string>>
}
