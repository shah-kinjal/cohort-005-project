import { describe, it, expect } from "vitest";
import { RefundStatus } from "~/db/schema";
import {
  REFUND_APPROVAL_THRESHOLD_CENTS,
  reviewRefund,
  type RefundReviewInput,
} from "./refund";

const LEARNER = 1;
const FIRST_REVIEWER = 2;
const SECOND_REVIEWER = 3;

function review(overrides: Partial<RefundReviewInput> = {}) {
  return reviewRefund({
    intent: "approve",
    status: RefundStatus.Requested,
    amountPaid: 4999,
    learnerId: LEARNER,
    reviewerId: FIRST_REVIEWER,
    firstApproverId: null,
    ...overrides,
  });
}

describe("reviewRefund", () => {
  describe("approving under the Approval threshold", () => {
    it("approves with one approval", () => {
      expect(
        review({ amountPaid: REFUND_APPROVAL_THRESHOLD_CENTS - 1 })
      ).toEqual({
        ok: true,
        next: RefundStatus.Approved,
        isFirstApproval: false,
      });
    });
  });

  describe("approving at or above the Approval threshold", () => {
    it("treats exactly $25.00 as needing two approvals", () => {
      expect(review({ amountPaid: REFUND_APPROVAL_THRESHOLD_CENTS })).toEqual({
        ok: true,
        next: RefundStatus.AwaitingSecondApproval,
        isFirstApproval: true,
      });
    });

    it("moves a larger Refund to awaiting second approval on the first approval", () => {
      expect(review({ amountPaid: 4999 })).toEqual({
        ok: true,
        next: RefundStatus.AwaitingSecondApproval,
        isFirstApproval: true,
      });
    });

    it("approves on the second approval by a different reviewer", () => {
      expect(
        review({
          status: RefundStatus.AwaitingSecondApproval,
          reviewerId: SECOND_REVIEWER,
          firstApproverId: FIRST_REVIEWER,
        })
      ).toEqual({
        ok: true,
        next: RefundStatus.Approved,
        isFirstApproval: false,
      });
    });

    it("rejects a second approval by the first approver", () => {
      const outcome = review({
        status: RefundStatus.AwaitingSecondApproval,
        reviewerId: FIRST_REVIEWER,
        firstApproverId: FIRST_REVIEWER,
      });
      expect(outcome.ok).toBe(false);
    });

    it("rejects a second approval when no first approver was recorded", () => {
      const outcome = review({
        status: RefundStatus.AwaitingSecondApproval,
        reviewerId: SECOND_REVIEWER,
        firstApproverId: null,
      });
      expect(outcome.ok).toBe(false);
    });
  });

  describe("declining", () => {
    it("declines finally under the threshold", () => {
      expect(review({ intent: "decline", amountPaid: 1000 })).toEqual({
        ok: true,
        next: RefundStatus.Declined,
        isFirstApproval: false,
      });
    });

    it("declines finally above the threshold with a single decline", () => {
      expect(review({ intent: "decline", amountPaid: 4999 })).toEqual({
        ok: true,
        next: RefundStatus.Declined,
        isFirstApproval: false,
      });
    });

    it("lets a different reviewer decline a Refund awaiting second approval", () => {
      expect(
        review({
          intent: "decline",
          status: RefundStatus.AwaitingSecondApproval,
          reviewerId: SECOND_REVIEWER,
          firstApproverId: FIRST_REVIEWER,
        })
      ).toEqual({
        ok: true,
        next: RefundStatus.Declined,
        isFirstApproval: false,
      });
    });
  });

  describe("who may review", () => {
    it.each(["approve", "decline"] as const)(
      "rejects the learner reviewing their own Refund (%s)",
      (intent) => {
        const outcome = review({ intent, reviewerId: LEARNER });
        expect(outcome).toEqual({
          ok: false,
          reason: "You cannot review your own refund.",
        });
      }
    );

    it.each(["approve", "decline"] as const)(
      "rejects the first approver reviewing again (%s)",
      (intent) => {
        const outcome = review({
          intent,
          status: RefundStatus.AwaitingSecondApproval,
          reviewerId: FIRST_REVIEWER,
          firstApproverId: FIRST_REVIEWER,
        });
        expect(outcome.ok).toBe(false);
      }
    );
  });

  describe("final states", () => {
    it.each([RefundStatus.Approved, RefundStatus.Declined])(
      "rejects any review of a %s Refund",
      (status) => {
        expect(review({ status }).ok).toBe(false);
        expect(review({ status, intent: "decline" }).ok).toBe(false);
      }
    );
  });
});
