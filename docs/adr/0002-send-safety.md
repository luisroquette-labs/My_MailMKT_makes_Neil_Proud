# ADR 0002 — Suppression, throttling and durable send state

## Context

Opt-outs and recent sends must be checked across every motor. A retry after an uncertain provider response may duplicate an email.

## Decision

Every motor reads the suppression set before reserving a send. The shared throttle uses local calendar days and the configured minimum interval. A unique send-log reservation and an outbox idempotency key prevent repeat attempts for the same step or occurrence. Definitive client failures release the reservation for a later retry. Timeout, rate limit and server failure preserve it until the pending-row policy resolves the uncertainty. The pending-row policy waits before retrying, discards old rows and alerts on dead letters. The fuse is consumed after a successful reservation, once per attempted send; success counts only confirmed deliveries.

## Consequences

The system favors avoiding duplicates over immediate delivery after ambiguous results. A provider outcome that cannot be established can leave a gap. Pagination of suppression and send-history reads is required; a partial read is unsafe. The current adapter's handling of pagination failures is tracked separately.
