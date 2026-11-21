# ADR 0003 — Campaign links and content safety

## Context

Analytics should identify each campaign and destination without multiplying records per lead. Invalid analytics inputs should not stop email delivery. Landing-page input and campaign copy are untrusted.

## Decision

Create or reuse one tracked link per campaign occurrence and distinct destination. A unique-slug conflict reuses the tracked URL and may refresh its destination. Other persistence errors fall back to the original destination. Exclude unsubscribe and `mailto:` anchors from promotional tracking. Apply the copy quality gate on save and send; rejected database copy falls back to the seed. Escape subjects, lead names and hrefs before rendering while retaining the editor-owned HTML body. The 25-day seed is a fallback when editable copy is absent.

## Consequences

Delivery continues during tracking outages, but analytics can be incomplete. The current regular-expression link rewriting can miss HTML forms it does not recognize; that gap is tracked separately. Tracking event registration is currently a no-op and is tracked separately.
