# An Approved refund ends the learner's access by deleting the enrollment

Status: accepted

## Context

A Purchase and a learner's access to a course are stored separately. A Refund request alone currently changes neither.

## Decision

When a Refund becomes an Approved refund, delete the learner's enrollment in that course. Access is unchanged while a Refund is pending or declined.

## Alternatives considered

- Keep the enrollment and mark it revoked. Preserves history, but every access check would need to know about the marker.

## Consequences

- The enrollment cannot be recovered after approval. The Refund and the Purchase remain as the record.
- Progress and watch history tied to the enrollment must be checked before this is built.
