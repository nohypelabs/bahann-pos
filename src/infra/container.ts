import { SupabaseDailySaleRepository } from './repositories/SupabaseDailySaleRepository';
import { SupabaseDailyStockRepository } from './repositories/SupabaseDailyStockRepository';
import { SupabaseBusinessProfileRepository } from './repositories/SupabaseBusinessProfileRepository';
import { SupabaseProductRepository } from './repositories/SupabaseProductRepository';
import { SupabaseStockMovementRepository } from './repositories/SupabaseStockMovementRepository';
import { SupabaseUserRepository } from './repositories/SupabaseUserRepository';
import { SupabasePasswordResetTokenRepository } from './repositories/SupabasePasswordResetTokenRepository';
import { SupabaseTransactionRepository } from './repositories/SupabaseTransactionRepository';
import { SupabasePaymentMethodRepository } from './repositories/SupabasePaymentMethodRepository';
import { SupabaseOutletRepository } from './repositories/SupabaseOutletRepository';
import { SupabasePromotionRepository } from './repositories/SupabasePromotionRepository';
import { SupabaseCashSessionRepository } from './repositories/SupabaseCashSessionRepository';
import { SupabaseStockAlertRepository } from './repositories/SupabaseStockAlertRepository';
import { SupabaseAuditRepository } from './repositories/SupabaseAuditRepository';
import { SupabaseUserManagementRepository } from './repositories/SupabaseUserManagementRepository';
import { SupabaseDashboardRepository } from './repositories/SupabaseDashboardRepository';
import { SupabasePaymentRequestRepository } from './repositories/SupabasePaymentRequestRepository';
import { SupabasePlatformRepository } from './repositories/SupabasePlatformRepository';
import { SupabaseAdminRepository } from './repositories/SupabaseAdminRepository';
import { LibTokenRotator } from './services/LibTokenRotator';
import { LibAuthCookieManager } from './services/LibAuthCookieManager';

import { RecordDailySaleUseCase } from '@/use-cases/sale/RecordDailySaleUseCase';
import { RecordDailyStockUseCase } from '@/use-cases/stock/RecordDailyStockUseCase';
import { ListProductsUseCase } from '@/use-cases/product/ListProductsUseCase';
import { CreateProductUseCase } from '@/use-cases/product/CreateProductUseCase';
import { UpdateProductUseCase } from '@/use-cases/product/UpdateProductUseCase';
import { DeleteProductUseCase } from '@/use-cases/product/DeleteProductUseCase';
import { AdjustStockUseCase } from '@/use-cases/stock/AdjustStockUseCase';
import { ListStockUseCase } from '@/use-cases/stock/ListStockUseCase';
import { GetProfileUseCase } from '@/use-cases/auth/GetProfileUseCase';
import { UpdateProfileUseCase } from '@/use-cases/auth/UpdateProfileUseCase';
import { RefreshTokenUseCase } from '@/use-cases/auth/RefreshTokenUseCase';
import { RequestPasswordResetUseCase } from '@/use-cases/auth/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '@/use-cases/auth/ResetPasswordUseCase';
import { VerifyResetTokenUseCase } from '@/use-cases/auth/VerifyResetTokenUseCase';
import { VerifyEmailUseCase } from '@/use-cases/auth/VerifyEmailUseCase';
import { ResendVerificationUseCase } from '@/use-cases/auth/ResendVerificationUseCase';
import { GetEmailVerifiedUseCase } from '@/use-cases/auth/GetEmailVerifiedUseCase';
import { CompleteRegistrationUseCase } from '@/use-cases/auth/CompleteRegistrationUseCase';
import { CreateTransactionUseCase } from '@/use-cases/transaction/CreateTransactionUseCase';
import { VoidTransactionUseCase } from '@/use-cases/transaction/VoidTransactionUseCase';
import { RefundTransactionUseCase } from '@/use-cases/transaction/RefundTransactionUseCase';
import { ListTransactionsUseCase } from '@/use-cases/transaction/ListTransactionsUseCase';
import { CreatePaymentUseCase } from '@/use-cases/payment/CreatePaymentUseCase';
import { ListPaymentsUseCase } from '@/use-cases/payment/ListPaymentsUseCase';
import { OutletUseCase } from '@/use-cases/outlet/OutletUseCase';
import { PromotionUseCase } from '@/use-cases/promotion/PromotionUseCase';
import { CashSessionUseCase } from '@/use-cases/cashSession/CashSessionUseCase';
import { StockAlertUseCase } from '@/use-cases/stockAlert/StockAlertUseCase';
import { AuditUseCase } from '@/use-cases/audit/AuditUseCase';
import { UserManagementUseCase } from '@/use-cases/user/UserManagementUseCase';
import { GetAccountPlanUseCase } from '@/use-cases/tenant/GetAccountPlanUseCase';
import { DashboardUseCase } from '@/use-cases/dashboard/DashboardUseCase';
import { ManagePaymentUseCase } from '@/use-cases/payment/ManagePaymentUseCase';
import { PlatformUseCase } from '@/use-cases/platform/PlatformUseCase';
import { ResetAllDataUseCase } from '@/use-cases/admin/ResetAllDataUseCase';
import { StockService } from '@/domain/services/StockService';
import { PricingService } from '@/domain/services/PricingService';

// Dependency Injection Container
export const container = {
  // ── Repositories ──
  userRepository: () => new SupabaseUserRepository(),
  businessProfileRepo: () => new SupabaseBusinessProfileRepository(),
  productRepo: () => new SupabaseProductRepository(),
  stockMovementRepo: () => new SupabaseStockMovementRepository(),
  passwordResetTokenRepo: () => new SupabasePasswordResetTokenRepository(),
  transactionRepo: () => new SupabaseTransactionRepository(),
  paymentMethodRepo: () => new SupabasePaymentMethodRepository(),
  outletRepo: () => new SupabaseOutletRepository(),
  promotionRepo: () => new SupabasePromotionRepository(),
  cashSessionRepo: () => new SupabaseCashSessionRepository(),
  stockAlertRepo: () => new SupabaseStockAlertRepository(),
  auditRepo: () => new SupabaseAuditRepository(),
  userManagementRepo: () => new SupabaseUserManagementRepository(),
  dailySaleRepo: () => new SupabaseDailySaleRepository(),
  dailyStockRepo: () => new SupabaseDailyStockRepository(),
  dashboardRepo: () => new SupabaseDashboardRepository(),
  paymentRequestRepo: () => new SupabasePaymentRequestRepository(),
  platformRepo: () => new SupabasePlatformRepository(),
  adminRepo: () => new SupabaseAdminRepository(),

  // ── Services ──
  tokenRotator: () => new LibTokenRotator(),
  authCookieManager: () => new LibAuthCookieManager(),
  stockService: () => StockService,
  pricingService: () => PricingService,

  // ── Legacy Use Cases ──
  saleUseCase: () => new RecordDailySaleUseCase(container.dailySaleRepo()),
  stockUseCase: () => new RecordDailyStockUseCase(container.dailyStockRepo()),

  // ── Auth Use Cases ──
  getProfileUseCase: () => new GetProfileUseCase(container.userRepository()),
  updateProfileUseCase: () => new UpdateProfileUseCase(container.userRepository()),
  refreshTokenUseCase: () => new RefreshTokenUseCase(container.tokenRotator(), container.authCookieManager()),
  requestPasswordResetUseCase: () => new RequestPasswordResetUseCase(container.userRepository(), container.passwordResetTokenRepo()),
  resetPasswordUseCase: () => new ResetPasswordUseCase(container.userRepository(), container.passwordResetTokenRepo()),
  verifyResetTokenUseCase: () => new VerifyResetTokenUseCase(container.passwordResetTokenRepo()),
  verifyEmailUseCase: () => new VerifyEmailUseCase(container.userRepository()),
  resendVerificationUseCase: () => new ResendVerificationUseCase(container.userRepository()),
  getEmailVerifiedUseCase: () => new GetEmailVerifiedUseCase(container.userRepository()),
  completeRegistrationUseCase: () => new CompleteRegistrationUseCase(container.outletRepo(), container.userRepository()),

  // ── Product Use Cases ──
  listProductsUseCase: () => new ListProductsUseCase(container.productRepo()),
  createProductUseCase: () => new CreateProductUseCase(container.productRepo()),
  updateProductUseCase: () => new UpdateProductUseCase(container.productRepo()),
  deleteProductUseCase: () => new DeleteProductUseCase(container.productRepo()),

  // ── Stock Use Cases ──
  adjustStockUseCase: () => new AdjustStockUseCase(container.dailyStockRepo(), container.stockMovementRepo()),
  listStockUseCase: () => new ListStockUseCase(container.productRepo(), container.dailyStockRepo(), container.stockMovementRepo()),

  // ── Transaction Use Cases ──
  createTransactionUseCase: () => new CreateTransactionUseCase(container.transactionRepo(), container.dailySaleRepo(), container.dailyStockRepo(), container.productRepo()),
  voidTransactionUseCase: () => new VoidTransactionUseCase(container.transactionRepo()),
  refundTransactionUseCase: () => new RefundTransactionUseCase(container.transactionRepo()),
  listTransactionsUseCase: () => new ListTransactionsUseCase(container.transactionRepo()),

  // ── Payment Use Cases ──
  createPaymentUseCase: () => new CreatePaymentUseCase(container.paymentMethodRepo()),
  listPaymentsUseCase: () => new ListPaymentsUseCase(container.paymentMethodRepo()),

  // ── Outlet Use Cases ──
  outletUseCase: () => new OutletUseCase(container.outletRepo()),

  // ── Promotion Use Cases ──
  promotionUseCase: () => new PromotionUseCase(container.promotionRepo()),

  // ── Cash Session Use Cases ──
  cashSessionUseCase: () => new CashSessionUseCase(container.cashSessionRepo()),

  // ── Stock Alert Use Cases ──
  stockAlertUseCase: () => new StockAlertUseCase(container.stockAlertRepo()),

  // ── Audit Use Cases ──
  auditUseCase: () => new AuditUseCase(container.auditRepo(), container.outletRepo()),

  // ── User Management Use Cases ──
  userManagementUseCase: () => new UserManagementUseCase(container.userManagementRepo(), container.outletRepo()),

  // ── Tenant Use Cases ──
  getAccountPlanUseCase: () => new GetAccountPlanUseCase(container.userRepository(), container.outletRepo()),

  // ── Dashboard Use Cases ──
  dashboardUseCase: () => new DashboardUseCase(container.dashboardRepo()),

  // ── Payment Request Use Cases ──
  managePaymentUseCase: () => new ManagePaymentUseCase(container.paymentRequestRepo(), container.userRepository()),

  // ── Platform Use Cases ──
  platformUseCase: () => new PlatformUseCase(container.platformRepo()),

  // ── Admin Use Cases ──
  resetAllDataUseCase: () => new ResetAllDataUseCase(container.adminRepo()),
};
