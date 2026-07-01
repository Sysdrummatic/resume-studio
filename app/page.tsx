import Link from "next/link";
import LandingPageFooter from "./components/footer";
import LandingSampleCv from "./components/landing-sample-cv";
import RecoveryRedirect from "./components/recovery-redirect";
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
      <RecoveryRedirect />
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
              <Link href="/login?mode=signup" className="btn btn-p btn-lg">
                Create LiveCV
                <ArrowIcon />
              </Link>
              <Link href="/resume" className="btn btn-o btn-lg">
                View sample LiveCV
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

        <LandingSampleCv />
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
          <h2 id="lp-cta-title">Build your LiveCV with OpenCiVera.</h2>
          <p className="lp-cta__p">
            Open the sample LiveCV to see a published link in action, then sign in and build your own
            from one structured source.
          </p>
          <div className="lp-cta__acts">
            <Link href="/login?mode=signup" className="btn btn-p btn-lg">
              Create LiveCV
              <ArrowIcon />
            </Link>
            <Link href="/resume" className="btn btn-o btn-lg">View sample LiveCV ↗</Link>
          </div>
        </div>
      </section>

      <LandingPageFooter />
      <ScrollReveal />
    </div>
  );
}
