import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Fast, modern resume publishing</p>
        <h1 id="hero-title">Create one master resume. Share tailored versions in seconds.</h1>
        <p className="hero__lead">
          OpenCVHub is becoming a full SaaS platform for professionals who want one source of truth for their career history
          and multiple public links for role-specific applications.
        </p>
        <div className="hero__cta">
          <Link className="btn btn--primary" href="/login">Get started free</Link>
          <Link className="btn btn--ghost" href="/resume">View Ariana sample resume</Link>
        </div>
      </section>

      <section className="features" aria-label="Key product capabilities">
        <article className="feature-card">
          <h2>Master resume model</h2>
          <p>Maintain one up-to-date career record and selectively expose content by target role.</p>
        </article>
        <article className="feature-card">
          <h2>Shareable public links</h2>
          <p>Create default and role-specific public resume links from your visibility configurations.</p>
        </article>
        <article className="feature-card">
          <h2>Import from existing CV</h2>
          <p>Start with deterministic parsing first, then evolve with AI-assisted enrichment in later phases.</p>
        </article>
      </section>

      <section className="timeline" aria-labelledby="timeline-title">
        <h2 id="timeline-title">Roadmap status</h2>
        <ol>
          <li><strong>Live now:</strong> Landing page and public resume preview.</li>
          <li><strong>Next:</strong> Account system with email verification and anti-temporary-email protection.</li>
          <li><strong>Then:</strong> User dashboard, visibility presets, and public link controls.</li>
        </ol>
      </section>
    </>
  );
}
