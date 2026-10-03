import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import LandingPageFooter from "./components/footer";
import LandingFeatures from "./components/landing-features";
import LandingSampleCv from "./components/landing-sample-cv";
import OpenCiVeraAnimation from "./components/open-civera-animation";
import RecoveryRedirect from "./components/recovery-redirect";
import RotatingWord from "./components/rotating-word";
import ScrollReveal from "./components/scroll-reveal";
import { getRequestAppI18n } from "./i18n/server";
import { APP_THEME_COOKIE_NAME, DEFAULT_APP_THEME, resolveAppTheme } from "./lib/app-theme";
import styles from "./landing.module.css";

export default async function HomePage() {
  const [{ locale, dictionary }, cookieStore] = await Promise.all([getRequestAppI18n(), cookies()]);
  const { hero, sample, animation, features, faq, cta, footer } = dictionary.landing;
  const initialTheme = resolveAppTheme(
    cookieStore.get(APP_THEME_COOKIE_NAME)?.value || DEFAULT_APP_THEME
  );

  return (
    <div className={`lp ${styles.page}`}>
      <RecoveryRedirect />
      <ScrollReveal />
      <section className={styles.hero} aria-labelledby="lp-hero-title">
        <div className={styles.container}>
          <p className={styles.heroEyebrow}>{hero.eyebrow}</p>
          <h1 id="lp-hero-title" className={styles.heroTitle}>
            {hero.title}
            <br />
            {hero.title_prefix} <RotatingWord words={hero.rotating_words} /> {hero.title_suffix}
          </h1>
          <p className={styles.heroLead}>
            {hero.description[0]}
            <br />
            <br />
            {hero.description[1]}
          </p>
          <div className={styles.actions}>
            <Link href="/login?mode=signup" className={styles.primaryAction}>
              {hero.primary_action}
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
            <Link href="/resume" className={styles.secondaryAction}>
              {hero.secondary_action}
            </Link>
          </div>
          <ul className={styles.heroMeta}>
            {hero.meta.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className={styles.section} id="resume" aria-labelledby="lp-resume-title">
        <div className={`${styles.sectionHead} ${styles.container}`} data-reveal>
          <p className={styles.eyebrow}>{sample.eyebrow}</p>
          <h2 id="lp-resume-title" className={styles.heading}>
            {sample.title}
          </h2>
          <p className={styles.description}>{sample.description}</p>
        </div>
        <div className={styles.preview}>
          <div className={styles.sheetFrame} data-sheet-frame>
            <div className={styles.sheet}>
              <LandingSampleCv labels={sample} locale={locale} />
            </div>
          </div>
          <div className={styles.stageMeta}>
            <span>{sample.data_note}</span>
            <Link href="/resume" className={styles.secondaryAction} aria-label={sample.open_aria}>
              {sample.open_action}
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
        </div>
      </section>
      <section className={styles.section} id="story-animation" aria-labelledby="animation-title">
        <div className={`${styles.sectionHead} ${styles.container}`} data-reveal>
          <h2 id="animation-title" className={styles.heading}>
            {animation.title}
          </h2>
          <p className={styles.description}>{animation.detail}</p>
        </div>
        <div className={styles.preview}>
          <OpenCiVeraAnimation
            locale={locale}
            initialTheme={initialTheme}
            title={animation.iframe_title}
          />
        </div>
      </section>
      <section className={styles.section} id="model" aria-labelledby="lp-model-title">
        <div className={`${styles.sectionHead} ${styles.container}`} data-reveal>
          <p className={styles.eyebrow}>{features.eyebrow}</p>
          <h2 id="lp-model-title" className={styles.heading}>
            {features.title}
          </h2>
          <p className={styles.description}>{features.description}</p>
        </div>
        <div className={styles.container}>
          <LandingFeatures labels={features} />
        </div>
      </section>
      <section className={styles.section} id="faq" aria-labelledby="faq-title">
        <div className={styles.container}>
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.eyebrow}>{"// FAQ"}</p>
            <h2 id="faq-title" className={styles.heading}>
              {faq.title}
            </h2>
          </div>
          <div className={styles.faq}>
            {faq.items.map((item) => (
              <details id={item.id} key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="lp-cta-title">
        <div className={`${styles.cta} ${styles.container}`} data-reveal>
          <p className={styles.ctaEyebrow}>{cta.eyebrow}</p>
          <h2 id="lp-cta-title">{cta.title}</h2>
          <p className={styles.ctaLead}>{cta.description}</p>
          <div className={styles.actions}>
            <Link href="/login?mode=signup" className={styles.primaryAction}>
              {cta.primary_action}
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
            <Link href="/resume" className={styles.secondaryAction}>
              {cta.secondary_action} ↗
            </Link>
          </div>
        </div>
      </section>
      <LandingPageFooter labels={footer} />
    </div>
  );
}
