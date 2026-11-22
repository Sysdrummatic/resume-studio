import Link from "./localized-link";
import type { AppDictionary } from "../i18n/types";
import styles from "../landing.module.css";

/* The landing's footer: frosted glass that slides over the pinned story at its end (#290). */
export default function LandingPageFooter({ labels }: { labels: AppDictionary["landing"]["footer"] }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>© 2026 OpenCiVera</span>
        <nav className={styles.footerLinks}>
          <Link href="/resume">{labels.sample_resume}</Link>
          <Link href="/docs">{labels.docs}</Link>
          <Link href="/#faq">{labels.faq}</Link>
          <Link href="/login">{labels.platform}</Link>
          <Link href="/privacy">{labels.privacy_policy}</Link>
          <Link href="/terms">{labels.terms}</Link>
          <a href="mailto:contact@opencivera.com">{labels.contact}</a>
        </nav>
      </div>
    </footer>
  );
}
