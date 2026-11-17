import { describe, it, expect } from "vitest";
import {
  buildApprovedRefundEmail,
  buildDeclinedRefundEmail,
} from "./refund-email";

const learner = {
  learnerName: "Emma",
  learnerEmail: "emma@example.com",
  courseTitle: "Introduction to TypeScript",
};

describe("buildApprovedRefundEmail", () => {
  it("addresses the learner and states the amount paid", () => {
    const email = buildApprovedRefundEmail({ ...learner, amount: 4999 });
    expect(email.to).toBe("emma@example.com");
    expect(email.subject).toBe("Refund approved — Introduction to TypeScript");
    expect(email.body).toContain("$49.99");
    expect(email.body).toContain("access to the course has ended");
  });
});

describe("buildDeclinedRefundEmail", () => {
  it("says the refund was declined and that access stays", () => {
    const email = buildDeclinedRefundEmail(learner);
    expect(email.subject).toBe("Refund declined — Introduction to TypeScript");
    expect(email.body).toContain("declined");
    expect(email.body).toContain("you keep your access");
  });

  it("uses the Refund vocabulary and not the avoided names", () => {
    const text = [
      buildApprovedRefundEmail({ ...learner, amount: 100 }).body,
      buildDeclinedRefundEmail(learner).body,
    ]
      .join("\n")
      .toLowerCase();
    for (const avoided of ["chargeback", "reversal", "cancellation"]) {
      expect(text).not.toContain(avoided);
    }
  });
});
