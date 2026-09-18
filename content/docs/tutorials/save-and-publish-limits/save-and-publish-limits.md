---
title: Save and publish limits
description: Why saving or publishing your CV can be temporarily blocked, and what to do about it.
updatedAt: 2026-09-18
author: Lukasz Michta
category: tutorials
order: 2
---

# Save and publish limits

OpenCiVera places a few limits on saves and publishes. They protect the shared
service from accidental loops, broken integrations, and bulk scripts. Normal
manual editing should stay well below these thresholds.

## What's limited

| Action | Limit |
| --- | --- |
| Saving a Master Resume draft | 30 saves per minute, per account |
| Publishing a Master Resume | 20 publishes per minute, per account |
| Saving a CV Version | 20 saves per minute, per account |
| Publishing a CV Version | 20 publishes per minute, per account |
| Document size | 100 KB per language version |

The counters reset automatically after a short window, usually about a minute.
You do not need support to clear a temporary limit.

## Why the document size is capped

A CV document is normally only a few kilobytes of text: names, roles, bullets,
and links. QR code entries store short URLs rather than embedded images. The
100 KB cap prevents an unusually large row from filling the database; it is not
intended to limit an ordinary CV.

## If you hit a limit during normal work

Wait about a minute, then try the action again. If you are scripting imports or
automated edits, slow down the request rate; the limit applies to the account,
not to an individual browser tab.

Repeated limits during normal manual editing are not expected. In that case,
record the message and contact support rather than repeatedly retrying.
