---
title: Publishing your first CV
description: From the first-use guide to a shareable, role-aware public CV, step by step.
updatedAt: 2026-09-18
author: Łukasz Michta
category: tutorials
order: 1
---

# Publishing your first CV

Use this guide when you are starting with a new account. It covers the first-use
guide, the private Master Resume, a selected CV version, publication, and the
first additional language.

:::info
**Before you start: the first-use guide**

New accounts may open `/onboarding` before the Dashboard. The guide is a safe
way to create the first Master Resume without learning the full editor at once.

1. Choose **Start from scratch** or import a supported YAML file.
2. Complete the section cards for your name, summary, roles, experience,
   education, skills, courses, interests and contact details. Optional sections
   can be left empty.
3. Use the live preview to check the result. Imported content is not published
   automatically; review it before applying it to the editor.
4. Select **Finish later** if you need a break. The saved progress appears on
   the Dashboard and can be resumed.
5. At the end, choose whether to create the first public CV. **Not now** saves
   the Master Resume without publishing anything.

The guide saves progress when you move between cards or finish later. Closing
the browser before a save can lose edits on the current card, so use the save
action before leaving.
:::

## 1. Edit your Master Resume

1. Open **Dashboard** in the top navigation (or go directly to `/master-resume`).

   ![Dashboard tab in the top navigation](/docs/tutorials/publishing-your-first-cv/resources/01-dashboard-nav.png)

2. Under **Master Resume**, click **Edit master resume**.

   ![Dashboard Master Resume card with the Edit master resume button](/docs/tutorials/publishing-your-first-cv/resources/02-dashboard-edit-master-resume.png)

3. The editor shows a **YAML Editor** on the left and a **live preview** on the
   right. Every change you make updates the preview immediately.

   ![Master Resume Editor with the YAML Editor and live preview](/docs/tutorials/publishing-your-first-cv/resources/03-yaml-editor.png)

4. If editing raw YAML feels like too much, switch to the **Human-friendly
   Editor** toggle for the same fields as a dedicated form.

   ![Human-friendly Editor toggle as an alternative to the YAML Editor](/docs/tutorials/publishing-your-first-cv/resources/04-human-friendly-editor.png)

5. Fill in your professional summary.
   
   ![Master Resume Editor with the YAML Editor / Filling summary](/docs/tutorials/publishing-your-first-cv/resources/05-summary.png)
   
   Mark your current position
   with `default: true` — other positions stay defined but hidden from the
   preview.

   Fill in your core data: name, job title, contact details, skills, work experience, and education. 
   
   ![Master Resume Editor with the YAML Editor / Filling location](/docs/tutorials/publishing-your-first-cv/resources/06-location.png)
   
6. When you're done, scroll down, add a change note, and click **Save
   MasterCV**.

   ![Save MasterCV dialog with change note field](/docs/tutorials/publishing-your-first-cv/resources/07-save-mastercv-modal.png)

7. Master Resume is the source for your CV Versions. You do not publish it
   directly; publication uses a selected snapshot.

## 2. Create a CV Version

1. Back on the **Dashboard**, click **Create CV version**.

2. Give the version a title and select the entries it should include (summary,
   experience, education, courses, skills, and interests). A viewer sees this
   selection only; anything left out stays private. Click **Save CV Version**.

   ![Create CV Version dialog with per-section selection checkboxes](/docs/tutorials/publishing-your-first-cv/resources/08-create-cv-version-modal.png)

3. The draft is ready under **Your CVs**, marked **Private** / **Noindex**:
   nothing is public yet. Click **Open CV** to preview it, or the gear icon for
   Edit / Publish / ATS (TXT) / PDF / Delete.

   ![Your CVs list showing a private, noindex draft version](/docs/tutorials/publishing-your-first-cv/resources/10-your-cvs-private-draft.png)

## 3. Publish the CV Version

1. From the gear menu, choose **Publish**.
2. Pick the language versions to include and the **default language**, and
   decide whether search engines may index the CV with **Allow indexing for
   this Published CV**. Click **Publish CV Version**.

   ![Publish CV Version dialog with language and indexing options](/docs/tutorials/publishing-your-first-cv/resources/11-publish-cv-version-modal.png)

3. The badges switch to **Published** (and **Indexable** if you allowed
   indexing).

   ![Publish CV Version dialog with language and indexing options](/docs/tutorials/publishing-your-first-cv/resources/12-publish-cv-version-modal.png)

4. Click **Copy link** next to the published version, or **Open CV** to
   preview it as a visitor.

5. Paste the link into a browser. Your CV is online at
   `/{your-slug}/{public-id}` and shows the published snapshot; later edits to
   Master Resume are not visible until you publish again.

   ![Published LiveCV public page](/docs/tutorials/publishing-your-first-cv/resources/13-public-cv-live.png)

6. To take the CV offline, use **Unpublish** from the same gear menu. The link
   stops resolving immediately.

## 4. Add a language version

1. Back in the **Master Resume Editor**, click **Languages**.

   ![Languages button in the Master Resume Editor](/docs/tutorials/publishing-your-first-cv/resources/14-languages-button.png)

2. Enter a language code and name, then click **Create version**.

   ![Add language version dialog with code, name, and short label fields](/docs/tutorials/publishing-your-first-cv/resources/15-add-language-version-modal.png)

3. A new tab appears next to your default language. Fill in the translated
   content.

   ![New language tab filled in, with the Save MasterCV dialog](/docs/tutorials/publishing-your-first-cv/resources/16-language-save-mastercv.png)

   Then **Save MasterCV** again.

   ![New language tab filled in, with the Save MasterCV dialog](/docs/tutorials/publishing-your-first-cv/resources/17-language-save-mastercv.png)

4. Go to **Your CVs**, open the gear menu on your version, and choose **Edit**.

5. Make sure all language versions you want to include are checked, then click
   **Save CV Version**.

   ![CV Version edit dialog with both language checkboxes selected](/docs/tutorials/publishing-your-first-cv/resources/18-cv-version-languages-checkboxes.png)

6. Publish again from the gear menu to make the new language live, then check
   the public link. Visitors can now switch between the selected languages.

   ![CV Version edit dialog with both language checkboxes selected](/docs/tutorials/publishing-your-first-cv/resources/19-cv-version-languages-published.png)

## Next steps

- Use the **ATS Ready** export options on the dashboard to download
  recruiter-friendly `.txt` or `.yaml` variants.
- Use the **PDF** export option to download a printable version of your CV.


