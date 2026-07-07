export type PlanCadence = 'none' | 'daily' | 'weekly';

export type PlanLike = {
  dueAt?: Date | null;
  targetValue?: number | null;
  cadence?: string | null;
  cadenceTimes?: number | null;
};

export type PlanKind = {
  hasDeadline: boolean;
  isQuantitative: boolean;
  isRecurring: boolean;
  cadence: PlanCadence;
  cadenceTimes: number | null;
};

export function planKind(plan: PlanLike): PlanKind {
  const cadence = (plan.cadence ?? 'none') as PlanCadence;
  const isRecurring = cadence !== 'none';
  return {
    hasDeadline: plan.dueAt != null,
    isQuantitative: plan.targetValue != null,
    isRecurring,
    cadence,
    cadenceTimes: isRecurring && plan.cadenceTimes != null ? plan.cadenceTimes : null,
  };
}
