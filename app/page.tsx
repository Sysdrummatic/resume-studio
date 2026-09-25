import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Globe2,
  Layers3,
  Link2,
  LockKeyhole,
  ShieldCheck
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
  layers: Layers3,
  link: Link2
} as const;

const BENEFIT_ICONS = [FileText, Layers3, Globe2] as const;

function stepNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export default async function HomePage() {
  const [appI18n, cookieStore] = await Promise.all([getRequestAppI18n(), cookies()]);
  const { locale, dictionary } = appI18n;
  const { hero, sample, benefits, animation, how, privacy, faq, cta, footer } = dictionary.landing;
  const initialTheme = resolveAppTheme(
    cookieStore.get(APP_THEME_COOKIE_NAME)?.value || DEFAULT_APP_THEME
  );

  return (
    <div className={`lp ${styles.page}`}>
      <RecoveryRedirect />
      <ScrollReveal />

      <section className={`${styles.hero} ${styles.container}`} aria-labelledby="landing-title">
        <div className={styles.heroCopy}>
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

      <ul className={`${styles.benefits} ${styles.container}`} aria-label={benefits.aria_label} data-reveal>
        {benefits.items.map((item, index) => {
          const Icon = BENEFIT_ICONS[index] ?? FileText;
          return (
            <li key={item}>
              <Icon aria-hidden="true" size={18} />
              {item}
            </li>
          );
        })}
      </ul>

      <section
        className={`${styles.animationSection} ${styles.container}`}
        id="story-animation"
        aria-labelledby="animation-title"
        data-reveal
      >
        <div className={styles.sectionHead}>
          <h2 id="animation-title">{animation.title}</h2>
          <p>{animation.description}</p>
        </div>
        <OpenCiVeraAnimation
          locale={locale}
          initialTheme={initialTheme}
          title={animation.iframe_title}
        />
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

      <section className={styles.privacyBand} id="privacy" aria-labelledby="privacy-title" data-reveal>
        <div className={`${styles.privacyInner} ${styles.container}`}>
          <div className={styles.privacyHead}>
            <ShieldCheck aria-hidden="true" size={28} />
            <h2 id="privacy-title">{privacy.title}</h2>
          </div>
          <div className={styles.privacyBody}>
            <p>{privacy.description}</p>
            <Link href="#faq" className={styles.secondaryAction}>
              {privacy.action}
            </Link>
          </div>
        </div>
      </section>

      <section className={`${styles.faq} ${styles.container}`} id="faq" aria-labelledby="faq-title" data-reveal>
        <h2 id="faq-title">{faq.title}</h2>
        <div>
          {faq.items.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`${styles.closing} ${styles.container}`} aria-labelledby="closing-title" data-reveal>
        <div>
          <h2 id="closing-title">{cta.title}</h2>
          <p>{cta.description}</p>
        </div>
        <Link href="/login?mode=signup" className={styles.primaryAction}>
          {cta.primary_action}
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </section>

      <LandingPageFooter labels={footer} />
    </div>
  );
}
