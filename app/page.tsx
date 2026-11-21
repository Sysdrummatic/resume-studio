import type { Metadata } from "next";
import { publicPageMetadata } from "./lib/seo-metadata";
import LandingPageFooter from "./components/footer";
import LandingFaq from "./components/landing/landing-faq";
import LandingStory from "./components/landing/landing-story";
import { buildSceneCv } from "./components/landing/scene-cv";
import { loadSampleResumeData } from "./lib/sample-resume";
import RecoveryRedirect from "./components/recovery-redirect";
import { getRequestAppI18n } from "./i18n/server";
import { getLanguageAlternatesMetadata } from "./lib/language-alternates";
import { getAppBaseUrl } from "./lib/env";
import { safeJsonLdScript } from "./lib/jsonld";
import { buildFaqPageJsonLd, buildSoftwareApplicationJsonLd } from "./lib/jsonld-schemas";
import styles from "./landing.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return publicPageMetadata({
    title: { absolute: dictionary.meta.default_title },
    description: dictionary.meta.description,
    path: "/",
    index: true,
    alternates: await getLanguageAlternatesMetadata("/"),
  });
}

/* The landing is one pinned CSS 3D story in nine stages (epic #190, issue #290). */
export default async function HomePage() {
  const [{ locale, dictionary }, sample] = await Promise.all([getRequestAppI18n(), loadSampleResumeData()]);
  const { hero, story, features, faq, cta, footer } = dictionary.landing;
  const sampleLocale =
    sample.locales.find((entry) => entry.code === locale) ??
    sample.locales.find((entry) => entry.code === sample.defaultLocale) ??
    sample.locales[0];
  const cv = buildSceneCv(sampleLocale.resume, sampleLocale.labels, story.scene.versions);

  return (
    <div className={styles.page}>
      {[
        buildSoftwareApplicationJsonLd(getAppBaseUrl(), dictionary.meta.description, locale),
        buildFaqPageJsonLd(faq.items),
      ].map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdScript(schema) }}
        />
      ))}
      <RecoveryRedirect />
      <LandingStory hero={hero} story={story} features={features} cta={cta} cv={cv} />
      <LandingFaq faq={faq} />
      <LandingPageFooter labels={footer} />
    </div>
  );
}
