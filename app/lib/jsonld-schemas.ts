import type { ResumeDocument } from "./resume-schema";
import { sanitizeExternalHref } from "./safe-url";

const SCHEMA_CONTEXT = "https://schema.org";
const SAME_AS_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);
const MAX_KNOWS_ABOUT = 30;
const MAX_DESCRIPTION_LENGTH = 300;

type JsonLdObject = Record<string, unknown>;

function trimUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function compact<T extends JsonLdObject>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === "") return false;
      return !(Array.isArray(entry) && entry.length === 0);
    }),
  ) as T;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function buildOrganizationJsonLd(baseUrl: string, description: string): JsonLdObject {
  const root = trimUrl(baseUrl);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    "@id": `${root}/#organization`,
    name: "OpenCiVera",
    url: root,
    logo: `${root}/favicon.svg`,
    description,
  };
}

export function buildWebSiteJsonLd(baseUrl: string, description: string, inLanguage: string): JsonLdObject {
  const root = trimUrl(baseUrl);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    "@id": `${root}/#website`,
    name: "OpenCiVera",
    url: root,
    description,
    inLanguage,
    publisher: { "@id": `${root}/#organization` },
  };
}

export function buildSoftwareApplicationJsonLd(baseUrl: string, description: string, inLanguage: string): JsonLdObject {
  const root = trimUrl(baseUrl);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "SoftwareApplication",
    name: "OpenCiVera",
    url: root,
    description,
    inLanguage,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "PLN" },
    publisher: { "@id": `${root}/#organization` },
  };
}

export function buildFaqPageJsonLd(items: ReadonlyArray<{ question: string; answer: string }>): JsonLdObject {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function buildTechArticleJsonLd(input: {
  baseUrl: string;
  path: string;
  title: string;
  description: string;
  inLanguage: string;
}): JsonLdObject {
  const root = trimUrl(input.baseUrl);
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "TechArticle",
    headline: input.title,
    description: input.description,
    inLanguage: input.inLanguage,
    url: `${root}${input.path}`,
    publisher: { "@id": `${root}/#organization` },
  };
}

export function buildBreadcrumbListJsonLd(items: ReadonlyArray<{ name: string; url: string }>): JsonLdObject {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Person for the public CV. `resume` MUST already be the selected/published document
 * (R09): nothing outside the saved selection may be read here. Only http(s) contact
 * links become `sameAs`; phone, e-mail and QR values are never exposed.
 */
export function buildPublicPersonJsonLd(
  resume: ResumeDocument,
  input: { name: string; canonicalUrl: string },
): JsonLdObject {
  const defaultSummary = resume.summary.find((summary) => summary.default);
  const sameAs = [
    ...new Set(
      resume.contact
        .map((item) => sanitizeExternalHref(item.link, SAME_AS_PROTOCOLS))
        .filter((href): href is string => Boolean(href)),
    ),
  ];
  const knowsAbout = [
    ...new Set(
      [...resume.skills.map((skill) => skill.name), ...resume.tech_stack]
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_KNOWS_ABOUT);

  return compact({
    "@type": "Person",
    name: input.name,
    jobTitle: defaultSummary?.position,
    description: defaultSummary?.description ? truncate(defaultSummary.description, MAX_DESCRIPTION_LENGTH) : undefined,
    url: input.canonicalUrl,
    mainEntityOfPage: input.canonicalUrl,
    sameAs,
    knowsAbout,
  });
}
