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
import { getRequestAppI18n } from "./i18n/server";
import { APP_THEME_COOKIE_NAME, DEFAULT_APP_THEME, resolveAppTheme } from "./lib/app-theme";
import styles from "./landing.module.css";

const FEATURE_ICONS = {
  file: FileText,
  layers: Layers3,
  link: Link2
} as const;

const BENEFIT_ICONS = [FileText, Layers3, Globe2] as const;

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
          <div className={styles.process} aria-label={hero.process_aria}>
            {hero.process.map((step, index) => (
              <span key={step}>
                {index > 0 ? <ArrowRight aria-hidden="true" size={14} /> : null}
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.sampleStage} id="sample">
          <div className={styles.sampleBar}>
            <span>
              <Link2 aria-hidden="true" size={13} />
              {sample.public_path}
            </span>
            <span className={styles.publishedStatus}>{sample.status}</span>
          </div>
          <LandingSampleCv labels={sample} />
          <div className={styles.sampleMeta}>
            <span>{sample.data_note}</span>
            <Link href="/resume" aria-label={sample.open_aria}>
              {sample.open_action}
              <ArrowRight aria-hidden="true" size={13} />
            </Link>
          </div>
        </div>
      </section>

      <div className={`${styles.benefits} ${styles.container}`} aria-label={benefits.aria_label}>
        {benefits.items.map((item, index) => {
          const Icon = BENEFIT_ICONS[index] ?? FileText;
          return (
            <div key={item}>
              <Icon aria-hidden="true" size={18} />
              {item}
            </div>
          );
        })}
      </div>

      <section
        className={`${styles.animationSection} ${styles.container}`}
        id="story-animation"
        aria-labelledby="animation-title"
      >
        <div className={styles.sectionIntro}>
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
      >
        <div className={styles.sectionIntro}>
          <h2 id="how-title">{how.title}</h2>
          <p>{how.description}</p>
        </div>
        <div className={styles.featureRows}>
          {how.features.map((feature) => {
            const Icon = FEATURE_ICONS[feature.icon];
            return (
              <article className={styles.featureRow} key={feature.title}>
                <Icon aria-hidden="true" size={28} />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className={styles.container}>
        <section className={styles.privacyPanel} id="privacy" aria-labelledby="privacy-title">
          <ShieldCheck aria-hidden="true" size={31} />
          <div>
            <h2 id="privacy-title">{privacy.title}</h2>
            <p>{privacy.description}</p>
          </div>
          <Link href="#faq" className={styles.secondaryAction}>
            {privacy.action}
          </Link>
        </section>

        <section className={styles.faq} id="faq" aria-labelledby="faq-title">
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
      </div>

      <section className={`${styles.closing} ${styles.container}`} aria-labelledby="closing-title">
        <h2 id="closing-title">{cta.title}</h2>
        <p>{cta.description}</p>
        <Link href="/login?mode=signup" className={styles.primaryAction}>
          {cta.primary_action}
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </section>

      <LandingPageFooter labels={footer} />
    </div>
  );
}
