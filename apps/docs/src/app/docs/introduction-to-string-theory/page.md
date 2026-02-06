---
title: Introduction to string theory
nextjs:
  metadata:
    title: Introduction to string theory
    description: String/content handling conventions in Lyceum.
---

This page covers practical "string theory" for Lyceum: content normalization, IDs, and search-safe text handling.

## Content normalization

- Normalize heading/text input before slug generation.
- Strip markdown formatting where plain text is required.
- Keep user-facing text and machine IDs separated.

## Slug and ID rules

- Use deterministic slug generation.
- Avoid duplicate heading text within a page when possible.
- Preserve backward compatibility for existing anchor links.

## Search implications

- Consistent normalization improves search recall.
- Avoid indexing decorative or duplicated content blocks.
