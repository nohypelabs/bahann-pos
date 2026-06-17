import { router } from '../trpc'
import { authRouter } from './auth'
import { stockRouter } from './stock'
import { salesRouter } from './sales'
import { productsRouter } from './products'
import { outletsRouter } from './outlets'
import { dashboardRouter } from './dashboard'
import { transactionsRouter } from './transactions'
import { cashSessionsRouter } from './cashSessions'
import { promotionsRouter } from './promotions'
import { stockAlertsRouter } from './stockAlerts'
import { usersRouter } from './users'
import { auditRouter } from './audit'
import { adminRouter } from './admin'
import { paymentsRouter } from './payments'
import { superAdminRouter } from './superAdmin'
import { paymentRequestsRouter } from './paymentRequests'
import { businessProfileRouter } from './businessProfile'
import { expensesRouter } from './expenses'
import { shiftsRouter } from './shifts'
import { posDevicesRouter } from './posDevices'
import { transactionApprovalsRouter } from './transactionApprovals'

/**
 * Main tRPC app router
 * Combines all sub-routers
 */
export const appRouter = router({
  auth: authRouter,
  stock: stockRouter,
  sales: salesRouter,
  products: productsRouter,
  outlets: outletsRouter,
  dashboard: dashboardRouter,
  transactions: transactionsRouter,
  cashSessions: cashSessionsRouter,
  promotions: promotionsRouter,
  stockAlerts: stockAlertsRouter,
  users: usersRouter,
  audit: auditRouter,
  admin: adminRouter,
  payments: paymentsRouter,
  superAdmin: superAdminRouter,
  paymentRequests: paymentRequestsRouter,
  businessProfile: businessProfileRouter,
  expenses: expensesRouter,
  shifts: shiftsRouter,
  posDevices: posDevicesRouter,
  transactionApprovals: transactionApprovalsRouter,
})

export type AppRouter = typeof appRouter
