import { alias } from "drizzle-orm/sqlite-core";
import { and, asc, eq, inArray } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";
import { data, Form, isRouteErrorResponse, Link, redirect } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/support.refunds";
import { db } from "~/db";
import {
  RefundStatus,
  courses,
  enrollments,
  purchases,
  refunds,
  users,
} from "~/db/schema";
import { requireRefundReviewer } from "~/lib/access.server";
import { REFUND_APPROVAL_THRESHOLD_CENTS, reviewRefund } from "~/lib/refund";
import { formatPrice } from "~/lib/utils";
import { parseFormData } from "~/lib/validation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

const reviewActionSchema = z.object({
  refundId: z.coerce.number().int(),
  intent: z.enum(["approve", "decline"]),
});

function getPendingRefunds() {
  const firstApprover = alias(users, "first_approver");

  return db
    .select({
      id: refunds.id,
      status: refunds.status,
      reason: refunds.reason,
      requestedAt: refunds.requestedAt,
      amountPaid: purchases.amountPaid,
      learnerId: users.id,
      learnerName: users.name,
      courseTitle: courses.title,
      firstApproverId: refunds.firstApprovedByUserId,
      firstApproverName: firstApprover.name,
    })
    .from(refunds)
    .innerJoin(purchases, eq(refunds.purchaseId, purchases.id))
    .innerJoin(users, eq(purchases.userId, users.id))
    .innerJoin(courses, eq(purchases.courseId, courses.id))
    .leftJoin(
      firstApprover,
      eq(refunds.firstApprovedByUserId, firstApprover.id)
    )
    .where(
      inArray(refunds.status, [
        RefundStatus.Requested,
        RefundStatus.AwaitingSecondApproval,
      ])
    )
    .orderBy(asc(refunds.requestedAt))
    .all();
}

export async function loader({ request }: Route.LoaderArgs) {
  const { userId } = await requireRefundReviewer(request);

  const pendingRefunds = getPendingRefunds().map((refund) => ({
    ...refund,
    canReview: reviewRefund({
      intent: "decline",
      status: refund.status,
      amountPaid: refund.amountPaid,
      learnerId: refund.learnerId,
      reviewerId: userId,
      firstApproverId: refund.firstApproverId,
    }).ok,
  }));

  return { pendingRefunds };
}

export async function action({ request }: Route.ActionArgs) {
  const { userId } = await requireRefundReviewer(request);

  const parsed = parseFormData(await request.formData(), reviewActionSchema);

  if (!parsed.success) {
    throw data("Invalid refund review.", { status: 400 });
  }

  const { refundId, intent } = parsed.data;

  const refund = db
    .select({
      status: refunds.status,
      firstApproverId: refunds.firstApprovedByUserId,
      amountPaid: purchases.amountPaid,
      learnerId: purchases.userId,
      courseId: purchases.courseId,
    })
    .from(refunds)
    .innerJoin(purchases, eq(refunds.purchaseId, purchases.id))
    .where(eq(refunds.id, refundId))
    .get();

  if (!refund) {
    throw data("Refund not found.", { status: 404 });
  }

  const outcome = reviewRefund({
    intent,
    status: refund.status,
    amountPaid: refund.amountPaid,
    learnerId: refund.learnerId,
    reviewerId: userId,
    firstApproverId: refund.firstApproverId,
  });

  if (!outcome.ok) {
    throw data(outcome.reason, { status: 403 });
  }

  const now = new Date().toISOString();

  db.transaction((tx) => {
    // Only write if the Refund is still in the state we read, so two reviewers
    // acting at once cannot both decide it.
    const result = tx
      .update(refunds)
      .set(
        outcome.isFirstApproval
          ? { status: outcome.next, firstApprovedByUserId: userId }
          : {
              status: outcome.next,
              resolvedAt: now,
              resolvedByUserId: userId,
              amountRefunded:
                outcome.next === RefundStatus.Approved
                  ? refund.amountPaid
                  : null,
            }
      )
      .where(and(eq(refunds.id, refundId), eq(refunds.status, refund.status)))
      .run();

    if (result.changes !== 1) {
      throw data("Someone else has already reviewed this refund.", {
        status: 409,
      });
    }

    // An Approved refund ends the learner's access to the course.
    if (outcome.next === RefundStatus.Approved) {
      tx.delete(enrollments)
        .where(
          and(
            eq(enrollments.userId, refund.learnerId),
            eq(enrollments.courseId, refund.courseId)
          )
        )
        .run();
    }
  });

  return redirect("/support/refunds");
}

function approveLabel(status: RefundStatus, amountPaid: number) {
  if (status === RefundStatus.AwaitingSecondApproval) {
    return "Give second approval";
  }
  return amountPaid >= REFUND_APPROVAL_THRESHOLD_CENTS
    ? "Give first approval"
    : "Approve refund";
}

export default function SupportRefunds({ loaderData }: Route.ComponentProps) {
  const { pendingRefunds } = loaderData;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Review refunds</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Oldest first. Refunds of {formatPrice(REFUND_APPROVAL_THRESHOLD_CENTS)}{" "}
        or more need two approvals from two different people. One decline is
        final.
      </p>

      {pendingRefunds.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No pending refunds.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {pendingRefunds.map((refund) => (
            <Card key={refund.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{refund.courseTitle}</h2>
                    <p className="text-sm text-muted-foreground">
                      {refund.learnerName} · {formatPrice(refund.amountPaid)} ·
                      requested{" "}
                      {new Date(refund.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {refund.status === RefundStatus.AwaitingSecondApproval
                      ? "Awaiting second approval"
                      : "Pending refund"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{refund.reason}</p>
                {refund.firstApproverName && (
                  <p className="text-xs text-muted-foreground">
                    First approved by {refund.firstApproverName}
                  </p>
                )}
                {refund.canReview ? (
                  <Form method="post" className="flex gap-2">
                    <input type="hidden" name="refundId" value={refund.id} />
                    <Button
                      type="submit"
                      name="intent"
                      value="approve"
                      size="sm"
                    >
                      {approveLabel(refund.status, refund.amountPaid)}
                    </Button>
                    <Button
                      type="submit"
                      name="intent"
                      value="decline"
                      size="sm"
                      variant="outline"
                    >
                      Decline refund
                    </Button>
                  </Form>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Another reviewer needs to handle this refund.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while reviewing refunds.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
    } else if (error.status === 403) {
      title = "Access denied";
    } else {
      title = `Error ${error.status}`;
    }
    message = typeof error.data === "string" ? error.data : error.statusText;
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <Link to="/support/refunds">
          <Button>Back to refunds</Button>
        </Link>
      </div>
    </div>
  );
}
