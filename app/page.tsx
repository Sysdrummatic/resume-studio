import Link from "next/link";
import LandingPageFooter from "./components/footer";
import RotatingWord from "./components/rotating-word";
import ScrollReveal from "./components/scroll-reveal";

// Words cycled in the hero headline — edit this list to taste.
const heroRotatingWords = ["grows", "evolves", "adapts", "scales"];

const publishingModel = [
  {
    tag: "master resume",
    chip: "1 record",
    chipType: "t" as const,
    title: "One structured career record",
    copy: "Maintain one authoritative source instead of managing disconnected CV files that diverge every time you apply.",
  },
  {
    tag: "publication path",
    chip: "Multi-view",
    chipType: "a" as const,
    title: "Shape different public narratives",
    copy: "Present distinct professional profiles for different audiences without fragmenting your underlying source data.",
  },
  {
    tag: "locale-aware output",
    chip: "EN / PL",
    chipType: "t" as const,
    title: "Language-specific delivery",
    copy: "Preserve locale-appropriate presentation while keeping the publishing model coherent and the source unified.",
  },
];

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default function HomePage() {
  return (
    <div className="lp">
      {/* HERO */}
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero__in lp-container">
          <div>
            <div className="lp-hero__lbl">{"// LiveCV publication platform"}</div>
            <h1 id="lp-hero-title" className="lp-hero__title">
              Create your ultimate LiveCV. <br />
              Which <RotatingWord words={heroRotatingWords} /> with you.
            </h1>
            <p className="lp-hero__lead">
              Managing your CV is broken. One version for this job, another for that role,
              then translations, and six months later nobody knows which PDF a recruiter has.
              <br /><br />
              OpenCiVera fixes that. Build your career record once, publish a tailored version
              for each audience, and update all of them the instant anything changes.
            </p>
            <div className="lp-hero__acts">
              <Link href="/login" className="btn btn-p btn-lg">
                Create your CV
                <ArrowIcon />
              </Link>
              <Link href="#resume" className="btn btn-o btn-lg">
                View sample resume
              </Link>
            </div>
            <div className="lp-hero__meta">
              <span className="lp-hm"><span className="lp-hm__dot" />One master CV</span>
              <span className="lp-hm"><span className="lp-hm__dot" />Multiple configurations</span>
              <span className="lp-hm"><span className="lp-hm__dot" />LiveCV always up-to-date</span>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-div" />

      {/* CV PREVIEW */}
      <section className="lp-sec lp-cv-sec" id="resume" aria-labelledby="lp-resume-title">
        <div className="lp-sechdr lp-container" data-reveal>
          <div className="lp-tag">{"// public link in action"}</div>
          <h2 id="lp-resume-title" className="lp-h">Your CV as your public business card.</h2>
          <p className="lp-p">
            The output layer is a clean structured view, designed for professional signal, not document formatting.
            This is what recipients see when they open your link.
          </p>
        </div>

        <div className="lp-cv" data-reveal>
          <div className="lp-cv__chrome">
            <div className="lp-cv__dots">
              <span />
              <span />
              <span />
            </div>
            <div className="lp-cv__url">
              <svg className="lp-cv__lock" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              opencvhub.netlify.app/<span className="lp-cv__url-hi">resume</span>
            </div>
            <Link href="/resume" className="lp-cv__ext" aria-label="Open sample resume">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>
          <div className="lp-cv__wrap">
            <div className="lp-cv__loading" aria-label="Loading sample resume">
              <div className="lp-cv__spinner" aria-hidden="true" />
              <p>Loading sample resume…</p>
            </div>
            <iframe
              src="https://opencvhub.netlify.app/resume"
              className="lp-cv__iframe"
              title="Sample public resume — OpenCiVera"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
            <div className="lp-cv__fallback">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
              <p>The embedded preview is temporarily unavailable. You can still explore the platform by viewing the full example.</p>
              <Link href="/resume" className="btn btn-p">Open sample resume ↗</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-div" />

      {/* PUBLISHING MODEL */}
      <section className="lp-sec" id="model" aria-labelledby="lp-model-title">
        <div className="lp-sechdr lp-container" data-reveal>
          <div className="lp-tag">{"// CV as Code model"}</div>
          <h2 id="lp-model-title" className="lp-h">Focus on your career record.</h2>
          <p className="lp-p">Manage your career information in one structured, consistent record. Don&apos;t think about layout or fitting your data to a given template. Edit YAML or use the editor, and leave the rest to us.</p>
        </div>

        <div className="lp-grid3 lp-container">
          {publishingModel.map((card) => (
            <article key={card.title} className="lp-card" data-reveal>
              <div className="lp-card__tag">{card.tag}</div>
              <span className={`lp-chip lp-chip--${card.chipType}`}>{card.chip}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="lp-div" />

      {/* FINAL CTA */}
      <section className="lp-cta-sec" aria-labelledby="lp-cta-title">
        <div className="lp-cta lp-container" data-reveal>
          <div className="lp-cta__lbl">{"// get started"}</div>
          <h2 id="lp-cta-title">Build your LiveCV on OpenCiVera.</h2>
          <p className="lp-cta__p">
            Open the sample LiveCV to see a published link in action, then sign in and build your own
            from one structured source.
          </p>
          <div className="lp-cta__acts">
            <Link href="/login" className="btn btn-p btn-lg">
              Login
              <ArrowIcon />
            </Link>
            <Link href="/resume" className="btn btn-o btn-lg">Check example profile ↗</Link>
          </div>
        </div>
      </section>

      <LandingPageFooter />
      <ScrollReveal />
    </div>
  );
}
