import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Globe2,
  Layers3,
  Link2,
  LockKeyhole,
  RefreshCw
} from "lucide-react";
import LandingPageFooter from "./components/footer";
import LandingSampleCv from "./components/landing-sample-cv";
import OpenCiVeraAnimation from "./components/open-civera-animation";
import RecoveryRedirect from "./components/recovery-redirect";
import ScrollReveal from "./components/scroll-reveal";
import { getRequestAppI18n } from "./i18n/server";
import { APP_THEME_COOKIE_NAME, DEFAULT_APP_THEME, resolveAppTheme } from "./lib/app-theme";
import styles from "./landing.module.css";

const FEATURE_ICONS = {
  file: FileText,
  globe: Globe2,
  layers: Layers3,
  link: Link2,
  refresh: RefreshCw
} as const;

function stepNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export default async function HomePage() {
  const [appI18n, cookieStore] = await Promise.all([getRequestAppI18n(), cookies()]);
  const { locale, dictionary } = appI18n;
  const {
    hero,
    sample,
    animation,
    experience_base: experienceBase,
    how,
    advantages,
    languages,
    structured_data: structuredData,
    privacy,
    vision,
    faq,
    cta,
    footer
  } = dictionary.landing;
  const initialTheme = resolveAppTheme(
    cookieStore.get(APP_THEME_COOKIE_NAME)?.value || DEFAULT_APP_THEME
  );

  return (
    <div className={`lp ${styles.page}`}>
      <RecoveryRedirect />
      <ScrollReveal />

      <section className={`${styles.hero} ${styles.container}`} aria-labelledby="landing-title">
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>{hero.eyebrow}</p>
          <h1 id="landing-title" className={styles.heroTitle}>
            {hero.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <p className={styles.heroLead}>{hero.description}</p>
          <div className={styles.actions}>
            <Link href="/login?mode=signup" className={styles.primaryAction}>
              {hero.primary_action}
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link href="/resume" className={styles.secondaryAction}>
              {hero.secondary_action}
            </Link>
          </div>
          <p className={styles.privateNote}>
            <LockKeyhole aria-hidden="true" size={14} />
            {hero.privacy_note}
          </p>
          <ol className={styles.process} aria-label={hero.process_aria}>
            {hero.process.map((step, index) => (
              <li key={step}>
                <span>{stepNumber(index)}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.heroSheet} id="sample">
          <div className={styles.sheetFrame} data-sheet-frame>
            <div className={styles.sheet}>
              <LandingSampleCv labels={sample} locale={locale} />
            </div>
          </div>
        </div>
      </section>

      <div className={`${styles.stageMeta} ${styles.container}`}>
        <span>{sample.data_note}</span>
        <Link href="/resume" aria-label={sample.open_aria}>
          {sample.open_action}
          <ArrowRight aria-hidden="true" size={13} />
        </Link>
      </div>

      <section
        className={`${styles.animationSection} ${styles.container}`}
        id="story-animation"
        aria-labelledby="animation-title"
        data-reveal
      >
        <div className={styles.sectionHead}>
          <h2 id="animation-title">{animation.title}</h2>
          <div className={styles.sectionCopy}>
            <p>{animation.description}</p>
            <p>{animation.detail}</p>
          </div>
        </div>
        <OpenCiVeraAnimation
          locale={locale}
          initialTheme={initialTheme}
          title={animation.iframe_title}
        />
      </section>

      <section className={`${styles.storySection} ${styles.container}`} aria-labelledby="experience-base-title" data-reveal>
        <div className={styles.storyIntro}>
          <p className={styles.sectionEyebrow}>{experienceBase.eyebrow}</p>
          <h2 id="experience-base-title">{experienceBase.title}</h2>
          <p>{experienceBase.description}</p>
        </div>
        <div className={styles.storyBody}>
          <ul className={styles.pointList}>
            {experienceBase.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section
        className={`${styles.howSection} ${styles.container}`}
        id="how"
        aria-labelledby="how-title"
        data-reveal
      >
        <div className={styles.sectionHead}>
          <h2 id="how-title">{how.title}</h2>
          <p>{how.description}</p>
        </div>
        <ol className={styles.featureRows}>
          {how.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[feature.icon];
            return (
              <li className={styles.featureRow} key={feature.title}>
                <span className={styles.featureIndex}>
                  <Icon aria-hidden="true" size={22} />
                  {stepNumber(index)}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={`${styles.valueSection} ${styles.container}`} aria-labelledby="advantages-title" data-reveal>
        <div className={styles.sectionHead}>
          <h2 id="advantages-title">{advantages.title}</h2>
          <p>{advantages.description}</p>
        </div>
        <div className={styles.valueGrid}>
          {advantages.items.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.storySection} ${styles.container}`} aria-labelledby="languages-title" data-reveal>
        <div className={styles.storyIntro}>
          <p className={styles.sectionEyebrow}>{languages.eyebrow}</p>
          <h2 id="languages-title">{languages.title}</h2>
        </div>
        <div className={styles.storyBody}>
          <p>{languages.description}</p>
        </div>
      </section>

      <section className={`${styles.storySection} ${styles.container}`} aria-labelledby="structured-data-title" data-reveal>
        <div className={styles.storyIntro}>
          <p className={styles.sectionEyebrow}>{structuredData.eyebrow}</p>
          <h2 id="structured-data-title">{structuredData.title}</h2>
          <p>{structuredData.description}</p>
        </div>
        <div className={styles.storyBody}>
          <p>{structuredData.detail}</p>
          <ul className={styles.pointList}>
            {structuredData.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className={styles.privacyBand} id="privacy" aria-labelledby="privacy-title" data-reveal>
        <div className={`${styles.privacyInner} ${styles.container}`}>
          <div className={styles.privacyHead}>
            <h2 id="privacy-title">{privacy.title}</h2>
          </div>
          <div className={styles.privacyBody}>
            <p>{privacy.description}</p>
            <p className={styles.emphasis}>{privacy.note}</p>
            <Link href="#publication-faq" className={styles.secondaryAction}>
              {privacy.action}
            </Link>
          </div>
        </div>
      </section>

      <section className={`${styles.visionSection} ${styles.container}`} aria-labelledby="vision-title" data-reveal>
        <p className={styles.sectionEyebrow}>{vision.eyebrow}</p>
        <h2 id="vision-title">{vision.title}</h2>
        <p>{vision.description}</p>
      </section>

      <section className={`${styles.faq} ${styles.container}`} id="faq" aria-labelledby="faq-title" data-reveal>
        <h2 id="faq-title">{faq.title}</h2>
        <div>
          {faq.items.map((item) => (
            <details id={item.id} key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`${styles.closing} ${styles.container}`} aria-labelledby="closing-title" data-reveal>
        <div className={styles.closingCopy}>
          <h2 id="closing-title">{cta.title}</h2>
          <p>{cta.description}</p>
        </div>
        <div className={styles.closingActions}>
          <Link href="/login?mode=signup" className={styles.primaryAction}>
            {cta.primary_action}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>

      <LandingPageFooter labels={footer} />
    </div>
  );
}
