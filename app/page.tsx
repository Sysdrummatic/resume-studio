import Link from "next/link";
import LandingPageFooter from "./components/footer";
import RotatingWord from "./components/rotating-word";

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
        <div className="lp-hero__in">
          <div>
            <div className="lp-hero__lbl">{"// LiveCV publication platform"}</div>
            <h1 id="lp-hero-title" className="lp-hero__title">
              Create your ultimate LiveCV. <br />
              Which <RotatingWord words={heroRotatingWords} /> with you.
            </h1>
            <p className="lp-hero__lead">
              Managing your CV is broken. <br />

              You create a version for one job.
              Then another version for a different role.
              Then you need it in English, then Polish.
              Six months later, three different PDFs float around out there.
              Nobody knows which version a recruiter actually has.
              <br /><br />
              OpenCiVera fixes this. <br />

              Build your career story once.
              Manage everything from one place.
              Share different versions to different people — without duplicating data.
              Change something? Everyone sees the update instantly.
              Your CV is finally under your control.
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

          {/* <aside className="lp-signal" aria-label="OpenCiVera system signal">
            <div className="lp-signal__head">
              <span className="lp-signal__title">OpenCiVera system</span>
              <span className="lp-signal__status"><span className="lp-signal__dot" />Active direction</span>
            </div>
            <div className="lp-signal__body">
              <div className="lp-signal__row">
                <div className="lp-node lp-node--hl">
                  <div className="lp-node__lbl">Surface</div>
                  <div className="lp-node__val">Public CV</div>
                </div>
                <div className="lp-node">
                  <div className="lp-node__lbl">Model</div>
                  <div className="lp-node__val">Master source</div>
                </div>
                <div className="lp-node">
                  <div className="lp-node__lbl">Control</div>
                  <div className="lp-node__val">Role-aware</div>
                </div>
              </div>
              <div className="lp-signal__divider" />
              <div className="lp-signal__meta">
                <div className="lp-mi">
                  <div className="lp-mi__k">Output</div>
                  <div className="lp-mi__v">Publication</div>
                </div>
                <div className="lp-mi">
                  <div className="lp-mi__k">Locale</div>
                  <div className="lp-mi__v">EN / PL</div>
                </div>
                <div className="lp-mi">
                  <div className="lp-mi__k">Status</div>
                  <div className="lp-mi__v">Live</div>
                </div>
                <div className="lp-mi lp-mi--wide">
                  <div className="lp-mi__k">Source pipeline</div>
                  <div className="lp-mi__v lp-mi__v--sm">YAML → structured record → public surface</div>
                </div>
                <div className="lp-mi">
                  <div className="lp-mi__k">Views</div>
                  <div className="lp-mi__v">Multi</div>
                </div>
              </div>
            </div>
          </aside> */}
        </div>
      </section>

      <div className="lp-div" />

      {/* CV PREVIEW */}
      <section className="lp-sec lp-cv-sec" id="resume" aria-labelledby="lp-resume-title">
        <div className="lp-sechdr">
          <div className="lp-tag">{"// public link in action"}</div>
          <h2 id="lp-resume-title" className="lp-h">Your CV as your public business card.</h2>
          <p className="lp-p">
            The output layer is a clean structured view — designed for professional signal, not document formatting.
            This is what recipients see when they open your link.
          </p>
        </div>

        <div className="lp-cv">
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
        <div className="lp-sechdr">
          <div className="lp-tag">{"// CV as Code model"}</div>
          <h2 id="lp-model-title" className="lp-h">Focus on your career record.</h2>
          <p className="lp-p">By using the CV as Code model, you can manage your career information in a structured and consistent way. Don&apos;t think about layout or adjusting your data to given template. Create your CV with ease by editing YAML or using the editor and leave the rest to us.</p>
        </div>

        <div className="lp-grid3">
          {publishingModel.map((card) => (
            <article key={card.title} className="lp-card">
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
        <div className="lp-cta">
          <div className="lp-cta__lbl">{"// current release"}</div>
          <h2 id="lp-cta-title">The platform foundation is live and the publishing model is taking shape.</h2>
          <p className="lp-cta__p">
            Explore the sample public resume, sign in to the current platform shell, and follow the transition toward a
            more controlled and premium resume workflow.
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
      {/* Legacy inline footer kept only for reference.
      <footer className="lp-footer">
        <div className="lp-footer__in">
          <div className="lp-footer__left">
            <div className="lp-footer__brand">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke="var(--accent)" strokeWidth="1.8" fill="none" />
                <circle cx="16" cy="16" r="5" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                <circle cx="16" cy="16" r="2" fill="var(--accent-teal)" />
              </svg>
              <span>OpenCiVera</span>
            </div>
            <nav className="lp-footer__links">
              <Link href="/resume">Sample resume</Link>
              <Link href="/login">Platform</Link>
            </nav>
          </div>
          <p className="lp-footer__copy">© 2026 OpenCiVera</p>
        </div>
      </footer> */}
    </div>
  );
}
