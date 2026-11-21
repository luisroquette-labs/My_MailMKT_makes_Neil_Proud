---
name: delete-comment
description: Audit code comments, move decisions to ADRs, file issues for shortcuts, and tighten the comment lint.
---

# Delete comments

1. Inventory tracked source, generated output and configuration. Keep required shebangs. Count real comments with a parser, not text matches that confuse URLs or strings with comments.
2. Read each comment with the surrounding code. Delete tautologies and stale claims. File a focused issue for each workaround being excused. Move durable decisions to `docs/adr/` with context, decision and consequences.
3. Run `npm run lint:comments`. The allowance is zero for maintained source; add any unavoidable legacy allowance per file, never as a repository-wide total. Check that strings containing `//` are accepted and actual comments are rejected.
4. Run targeted tests, inspect the diff for code changes, then follow the repository's review and delivery gates. Report removed lines, remaining debt, issues and ADRs.
