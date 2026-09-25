---
title: Troubleshoot save and publish problems
description: Diagnose the most common validation, limit and publication errors without losing your draft.
updatedAt: 2026-09-18
author: Łukasz Michta
category: tutorials
order: 10
---

# Troubleshoot save and publish problems

Most failures are recoverable. Keep the editor open, read the status message,
and do not repeatedly click an action that has already failed.

## Why did my save fail?

1. Check the active language tab and the section named in the error.
2. If you are in YAML mode, fix the invalid or incomplete YAML.
3. Switch to the Human-friendly Editor if you need help finding a missing
   value.
4. Try **Save MasterCV** once more.

If the browser offers a local draft, restore it before reloading. That copy is
not synchronized to another device, so save it to the server as soon as the
editor is usable.

## Why can I not create or publish a version?

- Create and save an Experience Base first.
- Ensure the CV Version has a title and at least one meaningful selected item.
- Confirm that each selected publication language has content.
- Check that the selected default language is included in the publication.
- If this version was published before, use its publish action again instead of
  creating a duplicate.

## Did I hit a request limit?

OpenCiVera limits repeated saves and publishes per account and caps document
size. The limits reset automatically after a short window. Wait about a minute,
slow down scripted requests, and retry. See [Save and publish limits](/docs/tutorials/save-and-publish-limits)
for the current values.

## Why is the public page showing older content?

Public links show the last published state of a CV. Save the Experience Base, update
the CV Version selection if necessary, and publish again. A private preview can
show current content while the public link still shows its last published state.

## What should I include when asking for help?

Record the exact error, the route you were using, the active locale, and whether
the version was private or public. Do not attach the complete YAML file to a
public ticket; it may contain personal data.
