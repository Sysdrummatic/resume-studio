export const LLMS_TXT_PATHS = [
  "/",
  "/#faq",
  "/resume",
  "/docs",
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
