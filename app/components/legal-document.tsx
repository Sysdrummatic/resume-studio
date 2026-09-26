import type { LegalDocument } from "../i18n/types";
import { Typography } from "./design-system/atoms/Typography";

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="card stack" style={{ maxWidth: "65ch", marginInline: "auto" }}>
      <Typography variant="h1">{document.title}</Typography>
      <Typography variant="body" muted>
        {document.last_updated}
      </Typography>

      {document.sections.map((section) => (
        <section key={section.title}>
          <Typography variant="h2">{section.title}</Typography>
          {section.paragraphs.map((paragraph) => (
            <Typography key={paragraph} variant="body">
              {paragraph}
            </Typography>
          ))}
          {section.bullets?.length ? (
            <ul>
              {section.bullets.map((bullet) => (
                <li key={bullet}>
                  <Typography as="span" variant="body">
                    {bullet}
                  </Typography>
                </li>
              ))}
            </ul>
          ) : null}
          {section.after?.map((paragraph) => (
            <Typography key={paragraph} variant="body">
              {paragraph}
            </Typography>
          ))}
        </section>
      ))}
    </article>
  );
}
