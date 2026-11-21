# ADR 0005 — Demonstration dashboard data

## Context

The dashboard is a portable demonstration of the email engine and has no production data connection in this repository.

## Decision

Use fixed fixtures and a short simulated loading delay to expose successful, empty and failed-reading states. Represent a failed read as `null`, never a zero count. Model archive as a completed status rather than deletion. Keep the same copy rules in the editor demonstration as in the engine.

## Consequences

The screen demonstrates interaction and failure states, not live sends or current metrics. A real product must wire the documented data contracts to its own backend before relying on the displayed values.
