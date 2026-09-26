---
title: Import and export your CV data
description: Create a portable YAML backup and restore it safely in your account.
updatedAt: 2026-09-18
author: Łukasz Michta
category: tutorials
order: 7
---

# Import and export your CV data

The Dashboard can export your resume data as one YAML bundle and import a bundle
created earlier. This is useful before a major edit, when moving to another
browser, or when you prepare content outside the editor.

## Export a backup

1. Open **Dashboard**.
2. In the **Experience Base** card, choose **Export**.
3. Save the downloaded YAML file somewhere private and durable.

The file contains account data rather than a public CV. Store it like any other
backup containing personal and professional information.

## Import a backup

1. Open **Dashboard** and choose **Import**.
2. Select a trusted `.yaml` or `.yml` file.
3. Read the confirmation dialog and confirm the import.
4. After the page reloads, inspect the Experience Base, the language versions, and
   the CV Versions.

The server validates the bundle before it is accepted. Import never publishes a
CV: imported private versions replace the existing private versions, while
published snapshots and their public links remain untouched. Review the result
before publishing anything again.

:::warning
Do not upload another person's private data or an untrusted YAML file. Keep
backups encrypted or access-controlled, just like the original CV.
:::

If the Import or Export buttons are not visible, the data-transfer feature is
disabled in the current environment. Continue editing in the application or
contact the administrator.

For a single-language editor file, use the editor's YAML export. For an
account-level backup, use the Dashboard transfer controls.
