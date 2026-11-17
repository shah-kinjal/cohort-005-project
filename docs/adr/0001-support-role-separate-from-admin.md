# Support agents get their own role, separate from Admin

Status: accepted

## Context

Refunds need reviewing by people who handle customer requests. The only existing privileged role is Admin, which also grants control of users, courses and categories.

## Decision

Add a `Support` user role. A Support agent can carry out Refund reviews and nothing else beyond what a Student can do. Admins can also carry out Refund reviews. Admins assign the Support role from the existing users page.

## Alternatives considered

- Make Admin the only reviewer. Simpler, but hands user, course and category control to everyone who handles refunds.

## Consequences

- Role checks that currently assume three roles must account for a fourth.
- The sidebar and any access helper must treat Support as able to see the Refund review screen only.
- Removing the role later means reassigning every Support agent.
