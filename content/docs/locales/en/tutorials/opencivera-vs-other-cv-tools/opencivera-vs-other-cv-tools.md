---
title: OpenCiVera compared with JSON Resume, RenderCV and Reactive Resume
description: How the OpenCiVera CV builder differs from JSON Resume, RenderCV and Reactive Resume, with a feature table and guidance on when each fits.
updatedAt: 2026-10-20
author: Łukasz Michta
category: tutorials
order: 23
---

# OpenCiVera compared with JSON Resume, RenderCV and Reactive Resume

**These tools solve different problems.** JSON Resume is a data standard, RenderCV is a command-line renderer for a YAML file, Reactive Resume is a self-hostable resume builder, and OpenCiVera is a hosted CV builder organised around one private Experience Base and many published LiveCVs.

| | OpenCiVera | JSON Resume | RenderCV | Reactive Resume |
| --- | --- | --- | --- | --- |
| What it is | Hosted CV builder | Open JSON schema for resumes, with themes and a registry | Command-line tool that renders a PDF from a YAML file | Open-source resume builder you can host yourself |
| You work in | Web form, with an optional YAML editor | JSON file plus tools | YAML file and terminal | Web editor |
| One source, many tailored versions | Yes: Experience Base plus saved LiveCV versions | You manage the files yourself | You manage the files yourself | Depends on how you organise resumes |
| Public link to a tailored CV | Yes: the LiveCV link, which you can disable | Via community registry or your own hosting | No hosted permalink; it generates a standalone HTML file that you can publish yourself | Shared resumes are supported |
| Output | Web page, PDF, TXT, YAML | Depends on the theme or tool | PDF, HTML, Markdown, Typst and PNG files | PDF and data export |
| Cost | Free | Free, open source | Free, open source | Free, open source |

:::info
Facts about other tools come from their public project pages as of October 2026. Check their sites for current details.
:::

## When each one fits

- **JSON Resume** if you want a vendor-neutral data format to build your own pipeline on.
- **RenderCV** if you are comfortable in a terminal and want a typeset PDF from a file under version control.
- **Reactive Resume** if you want an open-source builder you host and control yourself.
- **OpenCiVera** if you want to keep one record, publish different tailored versions under their own links, and not run anything yourself.

OpenCiVera also exports your data as YAML, so choosing it does not lock you in. See [CV as code in YAML](/docs/tutorials/cv-as-code-yaml) and [what a LiveCV is](/docs/tutorials/what-is-a-livecv).
