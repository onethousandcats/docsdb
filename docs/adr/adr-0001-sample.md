---
id: adr-0001
type: adr
title: Adopt schema-based frontmatter validation
owner: docs-platform
status: accepted
created: 2024-04-12
---

# ADR 0001: Adopt schema-based frontmatter validation

## Context

We need consistent metadata across docs and a CI gate that prevents invalid
frontmatter from landing.

## Decision

Validate Markdown frontmatter against a shared JSON Schema as part of CI.

## Consequences

- Invalid docs are blocked early in the pipeline.
- Documentation owners have clear expectations for required fields.
