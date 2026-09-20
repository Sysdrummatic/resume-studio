---
title: Publish and share a CV
description: Choose the public languages, visibility and link behavior for a saved CV version.
updatedAt: 2026-09-18
author: Łukasz Michta
category: tutorials
order: 5
---

# Publish and share a CV

**Goal:** share selected content and languages through a public link.

**Before you start:** [save and review your CV version](/docs/tutorials/create-cv-version). If you need another language, [prepare it before publishing](/docs/tutorials/add-language-version).

Publishing takes the saved selection and freezes it into a snapshot behind your
canonical public link. Later edits to Master Resume do not change that page
until you publish the version again.

## Publish a saved version

1. In **Dashboard**, find the private CV Version you want to share.
2. Open its settings menu and select **Publish**.
3. Check the language versions that should be available publicly.
4. Choose which of those languages should open by default.
5. Decide whether to enable **Allow indexing for this Published CV**.
6. Select **Publish CV Version**.

The version now shows its publication state, with **Copy link** and **Open CV**
available. Share the canonical link from the Dashboard, not a draft preview
URL.

## Understand public visibility

`noindex` asks search engines not to list the page; it does not make the URL
secret. Anyone with the link can view it. Only content selected in the CV
Version is included, so unselected Master Resume fields remain private.

Visitors can switch languages only when the locale was selected for this
publication. An unsupported `?lang=` value falls back to the published default.

## Update or take down a publication

After changing Master Resume or the CV Version selection, publish again to make
a new snapshot. To take the page offline, choose **Unpublish**. The saved
version stays in your account and can be published again later.

:::warning
Unpublishing stops the canonical link from resolving, but it cannot retract a
copy someone already downloaded or saved.
:::

For language setup before publishing, see [Add a language version](/docs/tutorials/add-language-version).

## Check the result

- Open the copied link in a private browser window.
- Check the content, available languages and absence of information you did not intend to share.
- Remember: disabling indexing does not make the link private.
