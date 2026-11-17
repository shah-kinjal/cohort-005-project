import { RefundStatus } from "~/db/schema";

export const REFUND_WINDOW_DAYS = 14;
export const REFUND_WATCH_LIMIT_SECONDS = 2 * 60 * 60;
export const REFUND_COMPLETION_LIMIT = 0.5;

/** At or above this amount paid, a Refund needs two approvals. */
export const REFUND_APPROVAL_THRESHOLD_CENTS = 2500;

export type RefundReviewIntent = "approve" | "decline";

export type RefundReviewInput = {
  intent: RefundReviewIntent;
  status: RefundStatus;
  amountPaid: number;
  learnerId: number;
  reviewerId: number;
  firstApproverId: number | null;
};

export type RefundReviewOutcome =
  | {
      ok: true;
      next: RefundStatus;
      /** True when this review is the First approval and not the final decision. */
      isFirstApproval: boolean;
    }
  | { ok: false; reason: string };

/**
 * What a Refund review does to a Refund, or why it is not allowed. Pure: the
 * caller writes the result.
 */
export function reviewRefund(input: RefundReviewInput): RefundReviewOutcome {
  const { intent, status, amountPaid, learnerId, reviewerId, firstApproverId } =
    input;

  if (status === RefundStatus.Approved || status === RefundStatus.Declined) {
    return { ok: false, reason: "This refund has already been decided." };
  }

  if (reviewerId === learnerId) {
    return { ok: false, reason: "You cannot review your own refund." };
  }

  if (reviewerId === firstApproverId) {
    return { ok: false, reason: "You have already reviewed this refund." };
  }

  if (intent === "decline") {
    return { ok: true, next: RefundStatus.Declined, isFirstApproval: false };
  }

  if (status === RefundStatus.AwaitingSecondApproval) {
    if (firstApproverId === null) {
      return { ok: false, reason: "This refund has no first approval." };
    }
    return { ok: true, next: RefundStatus.Approved, isFirstApproval: false };
  }

  if (amountPaid >= REFUND_APPROVAL_THRESHOLD_CENTS) {
    return {
      ok: true,
      next: RefundStatus.AwaitingSecondApproval,
      isFirstApproval: true,
    };
  }

  return { ok: true, next: RefundStatus.Approved, isFirstApproval: false };
}
