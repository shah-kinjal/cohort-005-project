# An Approved refund deletes the learner's enrollment

When a Refund is finally approved, we delete the learner's enrollment for that course, so access ends with no extra check anywhere. We rejected keeping the row with a revoked marker because every access check would need to know about it. The Refund and Purchase remain as the record, and lesson progress is kept because it is keyed by user.
