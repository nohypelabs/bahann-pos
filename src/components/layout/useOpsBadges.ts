'use client'

import { trpc } from '@/lib/trpc/client'
import { hasModule } from '@/lib/business/modules'

/**
 * Counts that need someone's attention (stock alerts, approvals waiting) and the
 * modules the tenant has. Shared by the sidebar and the top bar; the queries are
 * deduplicated by React Query, so calling it twice costs nothing.
 */
export function useOpsBadges() {
  const { data: businessProfile } = trpc.businessProfile.getMyProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })
  const canUseInventory = hasModule(businessProfile?.enabledModules, 'inventory')
  // Optional module: hidden until the profile says it is on, never shown while loading.
  const canUseWorkshop = hasModule(businessProfile?.enabledModules ?? [], 'workshop')

  const { data: actions } = trpc.transactions.myActions.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const canApprove = actions ? actions.canApproveVoid || actions.canApproveRefund : false

  const { data: activeAlerts } = trpc.stockAlerts.getActive.useQuery({}, { retry: false, staleTime: 60 * 1000 })
  const { data: pending } = trpc.transactionApprovals.list.useQuery(
    { status: 'pending', limit: 100 },
    // A cashier waits at the counter for an approval, so approvers poll.
    { retry: false, staleTime: 30 * 1000, refetchInterval: canApprove ? 30 * 1000 : false },
  )

  return {
    canUseInventory,
    canUseWorkshop,
    canApprove,
    alertCount: activeAlerts?.length || 0,
    pendingApprovalsCount: pending?.approvals?.length || 0,
  }
}
