import { formatPrice } from "~/lib/utils";

type RefundDecisionEmailInput = {
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  amount: number;
};

/** Sent once, when a Refund becomes an Approved refund. */
export function buildApprovedRefundEmail(input: RefundDecisionEmailInput) {
  return {
    to: input.learnerEmail,
    subject: `Refund approved — ${input.courseTitle}`,
    body: [
      `Hi ${input.learnerName},`,
      "",
      `Your refund request for "${input.courseTitle}" has been approved.`,
      `Our team will send ${formatPrice(input.amount)}, the amount you paid, back to the card you paid with.`,
      "",
      "Your access to the course has ended.",
      "",
      "— The Cadence team",
    ].join("\n"),
  };
}

/** Sent once, when a Refund becomes a Declined refund. */
export function buildDeclinedRefundEmail(
  input: Omit<RefundDecisionEmailInput, "amount">
) {
  return {
    to: input.learnerEmail,
    subject: `Refund declined — ${input.courseTitle}`,
    body: [
      `Hi ${input.learnerName},`,
      "",
      `We have reviewed your refund request for "${input.courseTitle}" and declined it.`,
      "Your purchase stays as it was, and you keep your access to the course.",
      "",
      "If you have questions, reply to this email.",
      "",
      "— The Cadence team",
    ].join("\n"),
  };
}
