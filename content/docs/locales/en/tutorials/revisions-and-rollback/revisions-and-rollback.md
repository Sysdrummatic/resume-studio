---
title: Review changes and roll back a revision
description: Use revision history to inspect saved documents and restore an earlier language version safely.
updatedAt: 2026-09-18
author: Łukasz Michta
category: tutorials
order: 9
---

# Review changes and roll back a revision

Every server save creates a revision for the active language document. History
is there when you need to check an older state before changing the current one.

## Preview history

1. Open **Experience Base**.
2. Select the language you want to inspect.
3. Open the **History** side panel.
4. Select a revision and open its preview.

The historical preview is read-only. Opening it does not replace the current
draft or discard unsaved edits.

## Roll back a document

1. Preview the revision and check both the content and language.
2. Choose **Rollback** for that revision.
3. Confirm and wait for the success message.
4. Review the current preview, then save any follow-up corrections.

Restoring changes the active Experience Base state for that language. It does not
rewrite a public snapshot. If the public CV should match the restored document,
update the CV Version and publish it again.

## Local drafts versus revisions

The local draft indicator is a browser recovery copy, not a server revision.
Save to the server before switching devices. If you do not need the local copy,
use the discard action; it restores the last saved server content in this
browser.

:::tip
Use meaningful change notes such as `Tailored summary for product roles` so a
future rollback is understandable without opening every revision.
:::
