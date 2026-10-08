import Link from "next/link";
import type { AppDictionary } from "../i18n/types";

export default function LandingPageFooter({ labels }: { labels: AppDictionary["landing"]["footer"] }) {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__in lp-container">
        <div className="lp-footer__left">
          <div className="lp-footer__brand">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke="var(--accent)" strokeWidth="1.8" fill="none" />
              <circle cx="16" cy="16" r="5" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
              <circle cx="16" cy="16" r="2" fill="var(--accent-teal)" />
            </svg>
            <span>OpenCiVera</span>
          </div>
          <nav className="lp-footer__links">
            <Link href="/resume">{labels.sample_resume}</Link>
            <Link href="/login">{labels.platform}</Link>
            <Link href="/privacy">{labels.privacy_policy}</Link>
            <Link href="/terms">{labels.terms}</Link>
            <a href="mailto:contact@opencivera.com">{labels.contact}</a>
          </nav>
        </div>
        <p className="lp-footer__copy">© 2026 OpenCiVera</p>
      </div>
    </footer>
  );
}
