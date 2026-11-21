# ADR 0001 — One dispatch round and editable order

## Context

Independent schedules can select several motors in the same local hour. The reference incident on 17 August came from independent scheduling. Database configuration can change the priority and operational windows without a deploy.

## Decision

One dispatcher selects motors due in the local hour, applies the configured priority and windows, and shares one throttle state and one fuse across the round. The dispatcher removes orphan reservations before loading throttle history. Preview mode skips both cleanup and pending-send recovery so it has no durable effects. An invalid configuration field falls back to its default; an omitted motor in the priority list is appended rather than disabled. Hour-only matching intentionally admits schedules at `:30` and `:45` during the hour's `:00` tick.

## Consequences

Changing the configured order changes actual execution order. An abandoned reservation cannot block a later lead after cleanup. Preview cannot establish delivery proof. The caller must provide the local clock and keep the round within the platform's execution limit.
