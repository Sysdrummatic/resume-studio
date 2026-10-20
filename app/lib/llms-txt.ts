// Public explainer pages (content/docs/.../tutorials), listed for answer engines.
const GUIDE_PAGES = [
  { path: "/docs/tutorials/what-is-a-livecv", title: "What is a LiveCV?", summary: "definition, and why it is not computer vision or a video CV" },
  { path: "/docs/tutorials/one-master-cv-many-versions", title: "One master CV, many tailored versions", summary: "keeping one career record instead of copied CV files" },
  { path: "/docs/tutorials/cv-as-code-yaml", title: "CV as code in YAML", summary: "what CV-as-Code means and how to export and import it" },
  { path: "/docs/tutorials/opencivera-vs-other-cv-tools", title: "OpenCiVera compared with JSON Resume, RenderCV and Reactive Resume", summary: "feature table and when each tool fits" },
] as const;

export const LLMS_TXT_PATHS = [
  "/",
  "/#faq",
  "/resume",
  "/docs",
  ...GUIDE_PAGES.map((page) => page.path),
  "/privacy",
  "/terms",
  "/llms-full.txt",
] as const;

const LLMS_TXT_HEADER = `# OpenCiVera

> OpenCiVera is a CV (resume) builder: you keep your career information once in a private Experience Base and select from it to create tailored LiveCVs. A LiveCV is a published, tailored CV with its own public link and PDF/ATS exports. OpenCiVera and LiveCV have nothing to do with computer vision or the OpenCV image-processing library; "CV" here means curriculum vitae.`;

export function buildLlmsTxt(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const link = (path: string) => `${base}${path}`;
  return `${LLMS_TXT_HEADER}

## Product

- [OpenCiVera home](${link("/")}): what the product does and how it works
- [FAQ](${link("/#faq")}): common questions about LiveCV, publishing and privacy
- [Sample LiveCV](${link("/resume")}): a public example of a published CV

## Guides

${GUIDE_PAGES.map((page) => `- [${page.title}](${link(page.path)}): ${page.summary}`).join("\n")}

## Documentation and policies

- [Documentation](${link("/docs")}): public tutorials on creating, editing and publishing a LiveCV
- [Privacy policy](${link("/privacy")})
- [Terms of service](${link("/terms")})

## Optional

- [Full product description](${link("/llms-full.txt")}): features and FAQ in every supported language
`;
}

export type LlmsFullLocale = {
  code: string;
  name: string;
  landing: {
    hero: { description: string[] };
    features: { description: string; items: Array<{ title: string; description: string }> };
    faq: { items: Array<{ question: string; answer: string }> };
  };
};

export function buildLlmsFullTxt(locales: LlmsFullLocale[]): string {
  const sections = locales.map(({ code, name, landing }) =>
    [
      `## ${name} (${code})`,
      "",
      ...landing.hero.description.flatMap((paragraph) => [paragraph, ""]),
      "### Features",
      "",
      landing.features.description,
      "",
      ...landing.features.items.map((item) => `- **${item.title}**: ${item.description}`),
      "",
      "### FAQ",
      "",
      ...landing.faq.items.flatMap((item) => [`**${item.question}**`, item.answer, ""]),
    ].join("\n"),
  );
  return `${LLMS_TXT_HEADER}\n\n${sections.join("\n")}`;
}
