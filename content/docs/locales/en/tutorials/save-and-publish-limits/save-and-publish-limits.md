---
title: Save and publish limits
description: Why saving or publishing your CV can be temporarily blocked, and what to do about it.
updatedAt: 2026-09-18
author: Łukasz Michta
category: tutorials
order: 2
---

# Save and publish limits

To keep OpenCiVera fast and reliable for everyone, a few limits protect the
shared database and hosting from being overwhelmed by an account that (by
accident, a bug, or a bulk script) sends far more requests than a person
editing a CV normally would.

## What's limited

| Action | Limit |
| --- | --- |
| Saving the Experience Base | 30 saves per minute, per account |
| Publishing a CV | 20 publishes per minute, per account |
| Saving a CV Version | 20 saves per minute, per account |
| Publishing a CV Version | 20 publishes per minute, per account |
| Document size | 100 KB per language version |

These limits reset automatically after a short window (about a minute) — you
don't need to contact support to unblock yourself.

## Why the document size is capped

A CV document is a few kilobytes of text (name, roles, bullet points, links).
Even with a QR code section added, that section only stores short URLs, not
embedded images — so a real document has no legitimate reason to approach
100 KB. The cap exists to stop a single account from filling the database
with abnormally large rows.

## If you hit a limit while doing normal work

- Wait about a minute and try saving or publishing again.
- If you're scripting imports or automating edits against your account,
  slow down the request rate — these limits apply per account, not per
  browser tab.
- If you're doing normal, manual editing and keep hitting a limit, that's
  unexpected — please get in touch so we can look into it.
