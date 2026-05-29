import Link from "next/link";

const platformStats = [
  {
    value: "1",
    label: "source resume",
    detail: "Maintain one structured career record instead of managing disconnected CV files.",
  },
  {
    value: "Multi-view",
    label: "publication system",
    detail: "Shape different public narratives without fragmenting your underlying source data.",
  },
  {
    value: "EN / PL",
    label: "locale-aware output",
    detail: "Preserve language-specific delivery while keeping the publishing model coherent.",
  },
];

const operatingLayers = [
  {
    id: "01",
    title: "Structured source layer",
    copy: "Store the career record as reusable data, not as one-off page composition.",
  },
  {
    id: "02",
    title: "Selection and visibility",
    copy: "Curate the signal for specific hiring contexts with clearer control over what stays visible.",
  },
  {
    id: "03",
    title: "Public release surface",
    copy: "Publish a cleaner, deliberate output instead of exposing an internal draft as-is.",
  },
];

const systemSignals = [
  "Auth-aware platform foundation",
  "RBAC and admin-ready model",
  "Resume export surface",
  "Publication lifecycle controls",
];

const workflow = [
  {
    step: "Capture",
    title: "Build the master record once",
    copy: "Collect the full career story in a format that can survive iteration, localization, and reuse.",
  },
  {
    step: "Configure",
    title: "Tune the public signal",
    copy: "Decide what should stay visible for a given audience rather than rewriting the document itself.",
  },
  {
    step: "Release",
    title: "Publish with a cleaner surface",
    copy: "Turn structured source data into a public view that reads like a designed professional profile.",
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__backdrop" aria-hidden="true">
          <div className="home-hero__orb home-hero__orb--left"></div>
          <div className="home-hero__orb home-hero__orb--right"></div>
          <div className="home-hero__grid"></div>
        </div>

        <div className="home-hero__content">
          <div className="home-hero__intro">
            <p className="home-kicker">Technical premium resume publishing</p>
            <h1 id="home-hero-title">Build a sharper public career surface on top of one controlled source record.</h1>
            <p className="home-hero__lead">
              OpenCiVera is evolving into a structured platform for professionals who want cleaner publication logic, role-aware
              resume delivery, and a more intentional public presence than static document workflows can offer.
            </p>

            <div className="home-hero__actions">
              <Link className="btn btn--primary" href="/login">
                Access platform
              </Link>
              <Link className="btn btn--ghost" href="/resume">
                View sample resume
              </Link>
            </div>
          </div>

          <aside className="home-command" aria-label="Platform command surface">
            <div className="home-command__panel">
              <div className="home-command__header">
                <p>OpenCiVera system</p>
                <span>Publishing signal</span>
              </div>

              <div className="home-command__core">
                <div className="home-command__badge">Active direction</div>
                <h2>From document editing to controlled public release.</h2>
                <p>
                  Shape resume output through structure, visibility, and release logic instead of constantly branching ad-hoc files.
                </p>
              </div>

              <dl className="home-command__metrics">
                <div>
                  <dt>Surface</dt>
                  <dd>Public CV</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>Master source</dd>
                </div>
                <div>
                  <dt>Control</dt>
                  <dd>Role-aware</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>

        <dl className="home-signals" aria-label="Platform highlights">
          {platformStats.map((stat) => (
            <div key={stat.label} className="home-signals__item">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
              <p>{stat.detail}</p>
            </div>
          ))}
        </dl>
      </section>

      <section className="home-operating-model" aria-labelledby="home-operating-model-title">
        <div className="home-section-heading">
          <p className="home-kicker">Operating model</p>
          <h2 id="home-operating-model-title">A modular workflow for public career presentation.</h2>
        </div>

        <div className="home-operating-model__layout">
          <div className="home-operating-model__stack">
            {operatingLayers.map((layer) => (
              <article key={layer.id} className="home-layer-card">
                <p className="home-layer-card__index">{layer.id}</p>
                <div>
                  <h3>{layer.title}</h3>
                  <p>{layer.copy}</p>
                </div>
              </article>
            ))}
          </div>

          <aside className="home-system-frame" aria-label="System capabilities">
            <p className="home-system-frame__label">Foundation signals</p>
            <ul className="home-system-frame__list">
              {systemSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
            <p className="home-system-frame__footnote">
              Designed as a product system, not just a static resume renderer with a nicer shell.
            </p>
          </aside>
        </div>
      </section>

      <section className="home-workflow" aria-labelledby="home-workflow-title">
        <div className="home-section-heading">
          <p className="home-kicker">Flow</p>
          <h2 id="home-workflow-title">Three deliberate stages from source data to public delivery.</h2>
        </div>

        <div className="home-workflow__rail">
          {workflow.map((item) => (
            <article key={item.step} className="home-workflow__step">
              <p className="home-workflow__number">{item.step}</p>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-resume-preview" aria-labelledby="home-resume-title">
        <div className="home-section-heading">
          <p className="home-kicker">Sample profile</p>
          <h2 id="home-resume-title">Inspect the public surface.</h2>
          <p>
            This is an example of a published public resume built from the OpenCiVera platform. Click to interact, or view the full public link.
          </p>
        </div>

        <div className="home-resume-frame">
          <div className="home-resume-chrome">
            <div className="home-resume-chrome__bar">
              <div className="home-resume-chrome__dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="home-resume-chrome__url">
                <svg className="home-resume-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>opencvhub.netlify.app/resume</span>
              </div>
              <Link href="/resume" className="home-resume-external" aria-label="Open in new tab">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </Link>
            </div>
            <div className="home-resume-loading" aria-label="Loading sample resume">
              <div className="home-resume-loading-spinner" aria-hidden="true"></div>
              <p className="home-resume-loading-text">Loading sample resume...</p>
            </div>
            <iframe
              src="https://opencvhub.netlify.app/resume"
              className="home-resume-iframe"
              title="Sample public resume showing OpenCiVera platform capabilities"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms"
            ></iframe>
            <noscript>
              <div className="home-resume-fallback" style={{ display: 'flex' }}>
                <p>Couldn't load the sample resume</p>
                <p>JavaScript is required to view the embedded preview. You can still explore the platform by viewing the full example.</p>
                <Link href="/resume" className="btn btn--primary">
                  View sample resume →
                </Link>
              </div>
            </noscript>
            <div className="home-resume-fallback">
              <p>Couldn't load the sample resume</p>
              <p>The embedded preview is temporarily unavailable. You can still explore the platform by viewing the full example.</p>
              <Link href="/resume" className="btn btn--primary">
                View sample resume →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-cta" aria-labelledby="home-cta-title">
        <div className="home-cta__copy">
          <p className="home-kicker">Current release</p>
          <h2 id="home-cta-title">The platform foundation is live and the publishing model is taking shape.</h2>
          <p>
            Explore the sample public resume, sign in to the current platform shell, and follow the transition toward a more
            controlled and premium resume workflow.
          </p>
        </div>

        <div className="home-cta__actions">
          <Link className="btn btn--primary" href="/login">
            Open product shell
          </Link>
          <Link className="btn btn--ghost" href="/resume">
            Inspect public example
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer__content">
          <div className="home-footer__branding">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6" opacity="0.3"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
            <span>OpenCiVera</span>
          </div>
          <nav className="home-footer__nav">
            <Link href="/resume">Sample resume</Link>
            <Link href="/login">Platform</Link>
          </nav>
          <p className="home-footer__copyright">© 2026 OpenCiVera</p>
        </div>
      </footer>
    </div>
  );
}
