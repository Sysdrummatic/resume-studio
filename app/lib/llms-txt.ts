export const LLMS_TXT_PATHS = ["/", "/#faq", "/resume", "/docs", "/privacy", "/terms"] as const;

export function buildLlmsTxt(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const link = (path: string) => `${base}${path}`;
  return `# OpenCiVera

> OpenCiVera is a CV (resume) builder: you keep your career information once in a private Experience Base and select from it to create tailored LiveCVs. A LiveCV is a published, tailored CV with its own public link and PDF/ATS exports. OpenCiVera and LiveCV have nothing to do with computer vision or the OpenCV image-processing library; "CV" here means curriculum vitae.

## Product

- [OpenCiVera home](${link("/")}): what the product does and how it works
- [FAQ](${link("/#faq")}): common questions about LiveCV, publishing and privacy
- [Sample LiveCV](${link("/resume")}): a public example of a published CV

## Documentation and policies

- [Documentation](${link("/docs")}): tutorials for signed-in users
- [Privacy policy](${link("/privacy")})
- [Terms of service](${link("/terms")})
`;
}
