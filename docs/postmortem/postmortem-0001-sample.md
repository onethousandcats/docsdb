---
id: postmortem-0001
type: postmortem
title: Validation pipeline outage
owner: docs-platform
severity: sev2
service: docs-validator
created: 2024-05-03
---

# Postmortem 0001: Validation pipeline outage

## Summary

Docs validation failed for two hours due to a misconfigured runner image.

## Root Cause

The pipeline image tag was pinned to a deprecated Node.js version.

## Action Items

- Update pipeline image tags quarterly.
- Add a canary docs validation job.
