export const ORDER_STATUS_VALUES = ["PENDING", "FOLLOWED", "READY_FOR_GIFTING", "COMPLETED", "FAILED", "REFUNDED"] as const;
export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];

export const ORDER_STATUS_OPTIONS: Array<{ value: OrderStatusValue; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "FOLLOWED", label: "Followed" },
  { value: "READY_FOR_GIFTING", label: "Ready for Gifting" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

export const HEALTH_STATE = {
  HEALTHY: "healthy",
  LOW: "low",
  CRITICAL: "critical",
} as const;

export type HealthState = (typeof HEALTH_STATE)[keyof typeof HEALTH_STATE];

export function getBalanceHealthState(balance: number, threshold: number): HealthState {
  if (threshold <= 0) {
    return HEALTH_STATE.HEALTHY;
  }

  if (balance < threshold * 0.5) {
    return HEALTH_STATE.CRITICAL;
  }

  if (balance < threshold) {
    return HEALTH_STATE.LOW;
  }

  return HEALTH_STATE.HEALTHY;
}

export function formatOrderStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
