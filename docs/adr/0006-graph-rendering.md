# ADR 0006 — Safe graph report links and hyperedges

## Context

The checked-in graph report injects document and URL metadata into HTML. A node identifier can include quotes or other hostile characters. Direct interpolation into an inline event handler previously broke links and exposed a stored script-injection path (issue 1838).

## Decision

Escape graph metadata before placing it in HTML attributes, use a `data-nid` attribute, and attach one delegated listener to the document. This remains attached when the neighbor list is rebuilt. Draw hyperedge regions from the nodes' convex hull in network coordinates; tracing raw member order can cross itself.

## Consequences

The report handles untrusted graph labels without constructing inline JavaScript handlers. The hull display represents the outer perimeter, including degenerate member sets. Regeneration of the report must preserve these rules.
