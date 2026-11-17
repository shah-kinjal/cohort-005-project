# Refunds of $25.00 or more need two approvals; one decline is final

Status: accepted

## Context

Approving a Refund commits money, while declining one only withholds it. Small Refunds do not justify two people's time.

## Decision

A Refund whose amount paid is $25.00 or more needs two approvals from two different reviewers. The first moves it to Awaiting second approval, the second makes it an Approved refund. Anything under $25.00 needs one approval. A single decline is final at any amount. Nobody may review their own Refund.

## Alternatives considered

- Require two declines above the threshold. Protects against a wrongful decline but adds a state and slows learners with no money at risk.
- One approval at every amount. Simpler, but no check on large payouts.

## Consequences

- The Refund needs a record of its first approver, and a new status for Awaiting second approval.
- The threshold is a business number and will need changing in one place.
- A decline cannot be undone, so a wrongful decline needs a manual fix outside the flow.
