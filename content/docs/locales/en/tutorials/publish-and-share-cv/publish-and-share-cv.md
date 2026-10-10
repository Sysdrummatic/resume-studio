---
title: Publish and share a LiveCV
description: Choose the public languages, visibility and link behavior for a saved LiveCV version.
updatedAt: 2026-10-03
author: Łukasz Michta
category: tutorials
order: 5
---

# Publish and share a LiveCV

**Goal:** share selected content and languages through a public link.

**Before you start:** [save and review your LiveCV version](/docs/tutorials/create-cv-version). If you need another language, [prepare it before publishing](/docs/tutorials/add-language-version).

Publishing takes the saved selection and freezes it into a snapshot behind your
canonical public link. Later edits to the Experience Base do not change that page
until you publish the version again.

## Publish a saved version

1. In **Dashboard**, find the private LiveCV version you want to share.
2. Open its settings menu and select **Publish**.
3. Check the language versions that should be available publicly.
4. Choose which of those languages should open by default.
5. Decide whether to enable **Allow search engines to index the public page**.
6. Select **Publish**.

The version now shows its publication state, with **Copy LiveCV link** and **Open LiveCV**
available. Share the canonical link from the Dashboard, not a draft preview
URL.

## Understand public visibility

`noindex` asks search engines not to list the page; it does not make the URL
secret. Anyone with the link can view it. Only content selected in the LiveCV
Version is included, so unselected Experience Base fields remain private.

Visitors can switch languages only when the locale was selected for this
publication. An unsupported `?lang=` value falls back to the published default.

## Update or take down a publication

To change a published LiveCV, open its settings menu, select **Edit**, adjust the
selection and click **Update LiveCV**. This saves your changes and replaces the content
under the same link. The editor also lets you choose which language versions the link serves and
which one opens by default (the languages already published are checked), and whether search
engines may index the page. The version stays published.
If you see "Changes were saved, but the LiveCV link was not updated", your changes are
safe but the link still shows the previous content; open **Edit** and click
**Update LiveCV** again. Changing only the Experience Base does not update the link;
it keeps showing its last published state until you update the version.

To take the page offline, choose **Unpublish**. The saved
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
