import type { ResumeDocument, ResumeLocale } from "../lib/resume-schema";
import { PREVIEW_LABELS } from "../lib/resume-schema";

type Props = {
  locale: ResumeLocale;
  resume: ResumeDocument;
};

function renderLevelDots(level: number): string {
  const clamped = Math.max(1, Math.min(5, Number(level || 0)));
  return "●".repeat(clamped) + "○".repeat(5 - clamped);
}

export default function ResumeLivePreview({ locale, resume }: Props) {
  const labels = PREVIEW_LABELS[locale];

  return (
    <article className="cv-preview">
      <header className="cv-preview__header">
        <div className="cv-preview__brand">{resume.brand_initials || "CV"}</div>
        <div>
          <h2>{resume.name || "Your Name"}</h2>
          <p>{resume.role || "Your Role"}</p>
        </div>
      </header>

      <div className="cv-preview__layout">
        <main className="cv-preview__main">
          <section>
            <h3>{labels.summary}</h3>
            <p>{resume.summary || "Your professional summary will appear here."}</p>
          </section>

          <section>
            <h3>{labels.experience}</h3>
            {resume.experience.length === 0 ? (
              <p className="cv-preview__placeholder">Add experience entries in the form.</p>
            ) : (
              <ul className="cv-list">
                {resume.experience.map((item, index) => (
                  <li key={`${item.company}-${index}`}>
                    <strong>{item.company || "Company"}</strong> - {item.role || "Role"}
                    {item.period ? <span className="cv-period"> ({item.period})</span> : null}
                    {item.highlights.length > 0 && (
                      <ul>
                        {item.highlights.map((highlight, highlightIndex) => (
                          <li key={`${highlight}-${highlightIndex}`}>{highlight}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>{labels.education}</h3>
            {resume.education.length === 0 ? (
              <p className="cv-preview__placeholder">Add education entries in the form.</p>
            ) : (
              <ul className="cv-list">
                {resume.education.map((item, index) => (
                  <li key={`${item.school}-${index}`}>
                    <strong>{item.school || "School"}</strong>
                    {item.period ? <span className="cv-period"> ({item.period})</span> : null}
                    {item.detail ? <p>{item.detail}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>{labels.courses}</h3>
            {resume.courses.length === 0 ? (
              <p className="cv-preview__placeholder">Add courses and certifications.</p>
            ) : (
              <ul className="cv-list">
                {resume.courses.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.year > 0 ? `${item.year} - ` : ""}
                    {item.name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        <aside className="cv-preview__side">
          <section>
            <h4>{labels.personalInfo}</h4>
            <ul>
              {resume.contact.length === 0 ? (
                <li className="cv-preview__placeholder">Add contact data.</li>
              ) : (
                resume.contact.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    <strong>{item.label}:</strong> {item.value}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h4>{labels.skills}</h4>
            <ul>
              {resume.skills.length === 0 ? (
                <li className="cv-preview__placeholder">Add skills.</li>
              ) : (
                resume.skills.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.name} <span className="cv-dots">{renderLevelDots(item.level)}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h4>{labels.techStack}</h4>
            <ul>
              {resume.tech_stack.length === 0 ? (
                <li className="cv-preview__placeholder">Add technologies.</li>
              ) : (
                resume.tech_stack.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
              )}
            </ul>
          </section>

          <section>
            <h4>{labels.languages}</h4>
            <ul>
              {resume.languages.length === 0 ? (
                <li className="cv-preview__placeholder">Add languages.</li>
              ) : (
                resume.languages.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.name}
                    {item.level_text ? ` - ${item.level_text}` : ""}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h4>{labels.interests}</h4>
            <ul>
              {resume.interests.length === 0 ? (
                <li className="cv-preview__placeholder">Add interests.</li>
              ) : (
                resume.interests.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
              )}
            </ul>
          </section>
        </aside>
      </div>
    </article>
  );
}
