import Link from "next/link";
import LandingPageFooter from "./components/footer";
import LandingSampleCv from "./components/landing-sample-cv";
import RecoveryRedirect from "./components/recovery-redirect";
import RotatingWord from "./components/rotating-word";
import ScrollReveal from "./components/scroll-reveal";
import { getRequestAppI18n } from "./i18n/server";

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default async function HomePage() {
  const { dictionary } = await getRequestAppI18n();
  const { hero, sample, model, cta, footer } = dictionary.landing;

  return (
    <div className="lp">
      <RecoveryRedirect />
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero__in lp-container">
          <div>
            <div className="lp-hero__lbl">{hero.eyebrow}</div>
            <h1 id="lp-hero-title" className="lp-hero__title">
              {hero.title_before} <br />
              {hero.title_connector} <RotatingWord words={hero.rotating_words} /> {hero.title_after}
            </h1>
            <p className="lp-hero__lead">
              {hero.lead.map((paragraph, index) => (
                <span key={paragraph}>
                  {index > 0 ? <><br /><br /></> : null}
                  {paragraph}
                </span>
              ))}
            </p>
            <div className="lp-hero__acts">
              <Link href="/login?mode=signup" className="btn btn-p btn-lg">
                {hero.primary_action}
                <ArrowIcon />
              </Link>
              <Link href="/resume" className="btn btn-o btn-lg">
                {hero.secondary_action}
              </Link>
            </div>
            <div className="lp-hero__meta">
              {hero.benefits.map((benefit) => (
                <span key={benefit} className="lp-hm"><span className="lp-hm__dot" />{benefit}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="lp-div" />

      <section className="lp-sec lp-cv-sec" id="resume" aria-labelledby="lp-resume-title">
        <div className="lp-sechdr lp-container" data-reveal>
          <div className="lp-tag">{sample.eyebrow}</div>
          <h2 id="lp-resume-title" className="lp-h">{sample.title}</h2>
          <p className="lp-p">{sample.description}</p>
        </div>

        <LandingSampleCv labels={sample} />
      </section>

      <div className="lp-div" />

      <section className="lp-sec" id="model" aria-labelledby="lp-model-title">
        <div className="lp-sechdr lp-container" data-reveal>
          <div className="lp-tag">{model.eyebrow}</div>
          <h2 id="lp-model-title" className="lp-h">{model.title}</h2>
          <p className="lp-p">{model.description}</p>
        </div>

        <div className="lp-grid3 lp-container">
          {model.cards.map((card) => (
            <article key={card.title} className="lp-card" data-reveal>
              <div className="lp-card__tag">{card.tag}</div>
              <span className={`lp-chip lp-chip--${card.chip_type}`}>{card.chip}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="lp-div" />

      <section className="lp-cta-sec" aria-labelledby="lp-cta-title">
        <div className="lp-cta lp-container" data-reveal>
          <div className="lp-cta__lbl">{cta.eyebrow}</div>
          <h2 id="lp-cta-title">{cta.title}</h2>
          <p className="lp-cta__p">{cta.description}</p>
          <div className="lp-cta__acts">
            <Link href="/login?mode=signup" className="btn btn-p btn-lg">
              {cta.primary_action}
              <ArrowIcon />
            </Link>
            <Link href="/resume" className="btn btn-o btn-lg">{cta.secondary_action}</Link>
          </div>
        </div>
      </section>

      <LandingPageFooter labels={footer} />
      <ScrollReveal />
    </div>
  );
}
