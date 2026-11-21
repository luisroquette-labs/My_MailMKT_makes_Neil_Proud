# ADR 0004 — Database constraints and service-only access

## Context

The portable schema must preserve send deduplication, a single configuration row, and atomic outbox transitions without hardcoding one production host.

## Decision

Use a unique key on recipient and email step, a primary key on outbox idempotency key, and a singleton configuration constraint. Keep row-level security enabled on operational tables. Revoke default execution of security-definer functions from public, anonymous and authenticated roles, then explicitly grant only the service role. Validate allowed campaign domains in the application layer rather than in a production-host-specific database check.

## Consequences

The application must use the service role for these operations and enforce the domain rule at its input boundary. The SQL outbox guarantees atomic reservation and state transitions; it cannot prove that an external email provider delivered exactly once.
