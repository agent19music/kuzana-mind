export type BillingLimits = {
  seats: number;
  chunks: number;
  upload_files: number;
  source_types: number | null;
  drive: boolean;
  price_per_seat_usd_cents: number;
};

export type BillingPlanId = "starter" | "pro" | "advanced" | "plus";
export type NormalizedPlanId = "starter" | "pro" | "advanced";

export type BillingEntitlement = {
  plan: BillingPlanId;
  plan_name: string;
  status: string;
  source: string | null;
  period_end: string | null;
  seats_billed: number;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  chunks: number;
  files: number;
  members: number;
  sources: string[];
  source_count: number;
  limits: BillingLimits;
  client_token: string | null;
  environment: string;
  price_id: string | null;
  price_id_plus?: string | null;
  chunk_count?: number;
  last_synced?: string | null;
  source_types?: string[];
};

/** Normalize legacy `plus` rows to `advanced`. */
export function normalizePlan(plan: string | null | undefined): NormalizedPlanId {
  if (plan === "plus" || plan === "advanced") return "advanced";
  if (plan === "pro" || plan === "starter") return plan;
  return "starter";
}

export function isPaidEntitlement(ent: BillingEntitlement): boolean {
  return ent.source === "paddle" || ent.source === "promo";
}

export function planLimitMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Plan limit reached.";
  const detail = (payload as { detail?: unknown }).detail ?? payload;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const d = detail as { message?: string; detail?: { message?: string } };
    return d.message || d.detail?.message || "Plan limit reached. Upgrade to continue.";
  }
  return "Plan limit reached.";
}
