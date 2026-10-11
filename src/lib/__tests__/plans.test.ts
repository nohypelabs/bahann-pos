import { buildPlanStatus, PLAN_GRACE_DAYS } from '@/lib/plans';

const now = new Date('2026-10-20T00:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

describe('buildPlanStatus', () => {
  it('reports days left for an active paid plan', () => {
    const s = buildPlanStatus({ storedPlan: 'starter', effectivePlan: 'starter', isTrial: false, periodEndsAt: days(10), now });
    expect(s).toMatchObject({ plan: 'starter', daysLeft: 10, inGrace: false });
    expect(s.accessEndsAt).toBe(days(10 + PLAN_GRACE_DAYS));
  });

  it('flags the grace period after the end date while access still works', () => {
    const s = buildPlanStatus({ storedPlan: 'professional', effectivePlan: 'professional', isTrial: false, periodEndsAt: days(-1), now });
    expect(s.inGrace).toBe(true);
    expect(s.daysLeft).toBe(-1);
  });

  it('is not in grace once the database has dropped access to free', () => {
    const s = buildPlanStatus({ storedPlan: 'starter', effectivePlan: 'free', isTrial: true, periodEndsAt: days(-5), now });
    expect(s).toMatchObject({ plan: 'free', inGrace: false });
  });

  it('has no period for free accounts', () => {
    const s = buildPlanStatus({ storedPlan: 'free', effectivePlan: 'free', isTrial: false, periodEndsAt: null, now });
    expect(s).toMatchObject({ daysLeft: null, accessEndsAt: null, inGrace: false });
  });
});
