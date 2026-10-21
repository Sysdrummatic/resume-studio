---
title: CV as code: your CV in YAML
description: What CV-as-Code means, why keeping CV content in YAML helps, and how OpenCiVera lets you edit, export and import it without knowing YAML.
updatedAt: 2026-10-20
author: Łukasz Michta
category: tutorials
order: 22
---

# CV as code: your CV in YAML

**CV-as-Code means your CV content is stored as structured text (here YAML) and kept separate from how it looks.** The same data can then be shown as a web page, a PDF or plain text, backed up, versioned and moved between tools.

## Why YAML

- **Portable:** a text file you own, readable without any particular app.
- **Reviewable:** changes are small and visible, which is why developers like it.
- **Reusable:** one source feeds a [public LiveCV](/docs/tutorials/what-is-a-livecv), a PDF and an ATS-friendly text export.

## You do not need to write YAML

OpenCiVera is a CV builder first. You fill in a regular form, and the YAML is generated for you. The YAML editor is there for people who want direct control: you can switch to it, edit, and the form stays in sync. The server validates the document before saving it.

## What you can do with the data

- **Export** the Experience Base as one YAML bundle for backup or reuse. See [Import and export your LiveCV data](/docs/tutorials/import-export-cv-data).
- **Download** a published LiveCV as PDF, TXT, ATS YAML or CVasCode source YAML. See [Export a PDF and ATS files](/docs/tutorials/export-pdf-and-ats).
- **Import** from PDF, DOCX, YAML or TXT, reviewing the result before anything is added.
