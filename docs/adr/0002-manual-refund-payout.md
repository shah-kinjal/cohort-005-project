# Approved refunds are paid out manually, outside the app

Status: accepted

## Context

The app has no payment processor integration. It stores only what a learner paid. An Approved refund must still get money back to the learner.

## Decision

Approving a Refund records the full amount paid and who decided it. A person then sends the money back through the payment provider's own dashboard. The app does not move money.

## Alternatives considered

- Integrate a payment processor now. Needs a provider choice, credentials and webhooks, which is far larger than this change.

## Consequences

- An Approved refund in the app does not prove the learner has been paid. Someone must follow up.
- A processor integration can replace the manual step later without changing the review flow.
